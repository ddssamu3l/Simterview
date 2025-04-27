import { defaultVoice } from "@/lib/deepgramConstants";
import type { StsConfig } from "@/utils/deepgramUtils";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export const useStsQueryParams = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [params, setParams] = useState<{
    voice: string;
    instructions: string | null;
    provider: string | null;
    model: string | null;
    temp: string | null;
    rep_penalty: string | null;
  }>({
    voice: searchParams.get("voice") || defaultVoice.canonical_name,
    instructions: searchParams.get("instructions"),
    provider: searchParams.get("provider"),
    model: searchParams.get("model"),
    temp: searchParams.get("temp"),
    rep_penalty: searchParams.get("rep_penalty"),
  });

  useEffect(() => {
    setParams({
      voice: searchParams.get("voice") || defaultVoice.canonical_name,
      instructions: searchParams.get("instructions"),
      provider: searchParams.get("provider"),
      model: searchParams.get("model"),
      temp: searchParams.get("temp"),
      rep_penalty: searchParams.get("rep_penalty"),
    });
  }, [searchParams]);

  const applyParamsToConfig = useCallback(
    (config: StsConfig) => {
      const { voice, instructions, provider, model, temp, rep_penalty } = params;
      return {
        ...config,
        agent: {
          ...config.agent,
          think: {
            ...config.agent.think,
            ...(provider && model && { provider: { type: provider }, model }),
            ...(instructions && {
              instructions: `${config.agent.think.instructions}\n${instructions}`,
            }),
          },
          speak: {
            ...config.agent.speak,
            ...(voice && { model: voice }),
            ...(temp && { temp: parseFloat(temp) }),
            ...(rep_penalty && { rep_penalty: parseFloat(rep_penalty) }),
          },
        },
      };
    },
    [params],
  );

  const updateUrlParam = useCallback(
    (param: string, value: string | null) => {
      const url = new URL(window.location.href);
      if (value) {
        url.searchParams.set(param, value);
      } else {
        url.searchParams.delete(param);
      }
      router.replace(url.toString());
    },
    [router],
  );

  const memoizedUpdateInstructionsUrlParam = useCallback(
    (text: string | null) => updateUrlParam("instructions", text),
    [updateUrlParam],
  );

  const memoizedUpdateVoiceUrlParam = useCallback(
    (voice: string) => updateUrlParam("voice", voice),
    [updateUrlParam],
  );

  return {
    ...params,
    applyParamsToConfig,
    updateInstructionsUrlParam: memoizedUpdateInstructionsUrlParam,
    updateVoiceUrlParam: memoizedUpdateVoiceUrlParam,
  };
};
