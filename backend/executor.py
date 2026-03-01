import requests
import time

# Judge0 CE — free, no-auth public code execution API
# https://ce.judge0.com
JUDGE0_BASE = "https://ce.judge0.com"

# Confirmed language IDs from https://ce.judge0.com/languages
# Using latest available versions where possible
LANGUAGE_IDS = {
    "python":     100,   # Python 3.12.5
    "javascript": 97,    # JavaScript (Node.js 20.17.0)
    "typescript": 101,   # TypeScript 5.6.2
    "cpp":        105,   # C++ (GCC 14.1.0)
    "c":          103,   # C (GCC 14.1.0)
    "java":       91,    # Java (JDK 17.0.6)
    "go":         107,   # Go 1.23.5
    "rust":       108,   # Rust 1.85.0
    "sql":        82,    # SQL (SQLite 3.27.2)
    "csharp":     51,    # C# (Mono 6.6.0.161)
    "kotlin":     111,   # Kotlin 2.1.10
    "ruby":       72,    # Ruby 2.7.0
    "php":        98,    # PHP 8.3.11
    "swift":      83,    # Swift 5.2.3
    "scala":      112,   # Scala 3.4.2
}

STATUS_MAP = {
    1: "In Queue",
    2: "Processing",
    3: "Accepted",
    4: "Wrong Answer",
    5: "Time Limit Exceeded",
    6: "Compilation Error",
    7: "Runtime Error (SIGSEGV)",
    8: "Runtime Error (SIGXFSZ)",
    9: "Runtime Error (SIGFPE)",
    10: "Runtime Error (SIGABRT)",
    11: "Runtime Error (NZEC)",
    12: "Runtime Error (Other)",
    13: "Internal Error",
    14: "Exec Format Error",
}


class CodeExecutor:
    @classmethod
    def execute(cls, language: str, code: str) -> dict:
        lang_id = LANGUAGE_IDS.get(language.lower())

        if lang_id is None:
            return {
                "error": f"Language '{language}' is not supported. Supported: {', '.join(LANGUAGE_IDS.keys())}",
                "status": "error"
            }

        try:
            # Submit code for execution
            submit_res = requests.post(
                f"{JUDGE0_BASE}/submissions?wait=false&base64_encoded=false",
                json={
                    "source_code": code,
                    "language_id": lang_id,
                    "stdin": "",
                    "cpu_time_limit": 15,
                    "memory_limit": 262144,  # 256 MB
                },
                timeout=15,
                headers={"Content-Type": "application/json"}
            )
            submit_res.raise_for_status()
            token = submit_res.json().get("token")

            if not token:
                return {"error": "Submission failed — no execution token received.", "status": "error"}

            # Poll until the result is ready (max ~25 seconds)
            for _ in range(25):
                time.sleep(1)
                result_res = requests.get(
                    f"{JUDGE0_BASE}/submissions/{token}?base64_encoded=false&fields=stdout,stderr,compile_output,status,time,memory",
                    timeout=10
                )
                result_res.raise_for_status()
                result = result_res.json()
                status_id = result.get("status", {}).get("id", 0)

                # Still queueing or running — keep polling
                if status_id in (1, 2):
                    continue

                # Build output
                parts = []
                if result.get("compile_output"):
                    parts.append(f"[Compiler]\n{result['compile_output'].strip()}")
                if result.get("stdout"):
                    parts.append(result["stdout"].strip())
                if result.get("stderr"):
                    parts.append(result["stderr"].strip())

                full_output = "\n".join(parts).strip() or "(no output)"

                # Time / memory stats
                if result.get("time"):
                    full_output += f"\n\n─── ⏱ {result['time']}s"
                if result.get("memory"):
                    full_output += f"  🗃 {round(result['memory']/1024, 1)} MB"

                if status_id == 3:
                    return {"output": full_output, "status": "success"}
                elif status_id == 6:
                    return {"output": full_output, "status": "error"}
                else:
                    label = STATUS_MAP.get(status_id, f"Status {status_id}")
                    return {"output": f"[{label}]\n{full_output}", "status": "error"}

            return {"output": "Execution timed out after 25s.", "status": "error"}

        except requests.exceptions.Timeout:
            return {"output": "Request to execution engine timed out.", "status": "error"}
        except requests.exceptions.ConnectionError:
            return {"error": "Could not reach Judge0 execution engine. Check your internet connection.", "status": "error"}
        except Exception as e:
            return {"error": str(e), "status": "error"}
