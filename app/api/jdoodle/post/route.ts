"use server"
/**
 * Executes code using the JDoodle API.
 * 
 * This function sends code to the JDoodle API for compilation and execution,
 * supporting Python, Java, and C++. It maps the input language to JDoodle's
 * language and version parameters, sends the code for execution, and returns
 * the execution results.
 * 
 * @param {Object} params - The code execution parameters
 * @param {string} params.language - The programming language ("python", "java", or "cpp")
 * @param {string} params.code - The code to execute
 * @returns {Promise<{stdout: string, stderr: string, memory: string, cpuTime: string}>}
 *   Object containing execution results:
 *   - stdout: Standard output from the code execution
 *   - stderr: Standard error (empty if no errors)
 *   - memory: Memory usage information
 *   - cpuTime: CPU time used for execution
 * @throws {Error} If the JDoodle API call fails
 */
export async function runCode({ language, code }: { language: string; code: string }) {
  const langMap: Record<string, { language: string; versionIndex: string }> = {
    python: { language: 'python3', versionIndex: '3' },
    java: { language: 'java', versionIndex: '4' },
    cpp: { language: 'cpp17', versionIndex: '0' },
  }

  const { language: jdLang, versionIndex } = langMap[language] || langMap.python

  const payload = {
    clientId: process.env.NEXT_PUBLIC_JDOODLE_CLIENT_ID!,
    clientSecret: process.env.NEXT_PUBLIC_JDOODLE_CLIENT_SECRET!,
    script: code,
    language: jdLang,
    versionIndex: versionIndex,
  }

  const res = await fetch('https://api.jdoodle.com/v1/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`JDoodle error: ${text}`)
  }

  const result = await res.json()
  return {
    stdout: result.output ?? '',
    stderr: '',
    memory: result.memory,
    cpuTime: result.cpuTime,
  }
}
