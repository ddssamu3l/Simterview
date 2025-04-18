// lib/runCode.ts
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
