/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import debounce from 'lodash/debounce';
import { runCode as executeCode } from '@/app/api/jdoodle/post/route';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type CodeEditorProps = {
  onRun?: (output: string, code: string) => void;
  onCodeChange?: (code: string) => void;
};

export default function CodeRunner({ onRun, onCodeChange }: CodeEditorProps) {
  const [language, setLanguage] = useState<'python' | 'java' | 'cpp'>('python');
  const [code, setCode] = useState<string>({
    python: `print("Hello, Python!")`,
    java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, Java!");\n  }\n}`,
    cpp: `#include <iostream>\nint main() {\n  std::cout << "Hello, C++!" << std::endl;\n  return 0;\n}`
  }[language]);
  const [output, setOutput] = useState<string>('');

  // Run-button cooldown
  const [runDisabled, setRunDisabled] = useState(false);
  const [runError, setRunError] = useState('');

  // Keep ref to latest onCodeChange callback
  const onCodeChangeRef = useRef(onCodeChange);
  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  // Debounced code-change emitter
  const debouncedCodeChange = useMemo(
    () =>
      debounce((newCode: string) => {
        onCodeChangeRef.current?.(newCode);
      }, 500),
    []
  );
  useEffect(() => () => debouncedCodeChange.cancel(), [debouncedCodeChange]);

  const handleLangChange = (lang: typeof language) => {
    setLanguage(lang);
    setCode({
      python: `print("Hello, Python!")`,
      java: `public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, Java!");\n  }\n}`,
      cpp: `#include <iostream>\nint main() {\n  std::cout << "Hello, C++!" << std::endl;\n  return 0;\n}`
    }[lang]);
    setOutput('');
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    debouncedCodeChange(newCode);
  };

  const handleRun = async () => {
    if (runDisabled) {
      setRunError('You have attempted to run code too soon. Please try again in a few seconds.');
      return;
    }

    // disable further runs for 3s
    setRunDisabled(true);
    setRunError('');
    setTimeout(() => {
      setRunDisabled(false);
      setRunError('');
    }, 4000);

    // flush pending debounce so onCodeChange gets called before run
    debouncedCodeChange.flush();

    setOutput('Running…');
    try {
      const { stdout, stderr } = await executeCode({ language, code });
      const combined = `${stdout || ''}${stderr ? `\n${stderr}` : ''}`;
      setOutput(combined);
      onRun?.(combined, code);
    } catch (err) {
      console.error(err);
      setOutput('Error running code.');
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-2 bg-dark-400">
        <select
          value={language}
          onChange={e => handleLangChange(e.target.value as any)}
          className="p-1 border rounded"
        >
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>
        <button
          onClick={handleRun}
          disabled={runDisabled}
          className={`px-3 py-1 rounded ${runDisabled
              ? 'bg-gray-600 cursor-not-allowed text-gray-300'
              : 'bg-primary-100 text-black'
            }`}
        >
          Run
        </button>
      </div>

      {runError && (
        <div className="p-2 text-sm text-red-400">{runError}</div>
      )}

      <div className="flex-1 overflow-hidden">
        <MonacoEditor
          height="calc(100% - 60px)"
          language={language === 'cpp' ? 'cpp' : language}
          value={code}
          onChange={val => handleCodeChange(val || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true
          }}
        />

        <div className="h-[60px] px-2 py-1 bg-dark-400 border-t text-sm overflow-x-hidden text-white">
          {output || 'Output...'}
        </div>
      </div>
    </div>
  );
}
