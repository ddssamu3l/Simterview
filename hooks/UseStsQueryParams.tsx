import { defaultVoice } from "@/lib/deepgramConstants";
import type { StsConfig } from "@/utils/deepgramUtils";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * Custom hook for managing Speech-to-Speech (STS) query parameters.
 * 
 * This hook manages URL query parameters for controlling various aspects
 * of the Deepgram voice interview experience, including:
 * - Voice model selection
 * - Custom instructions
 * - AI provider and model
 * - Temperature and repetition penalty settings
 * 
 * It provides functions to apply these parameters to the STS configuration
 * and update the URL to persist these settings.
 * 
 * @returns {Object} Hook return value with:
 *   - voice: Selected voice model canonical name
 *   - instructions: Custom instructions for the AI (if any)
 *   - provider: Selected AI provider (if specified)
 *   - model: Selected AI model (if specified)
 *   - temp: Temperature setting for generation (if specified)
 *   - rep_penalty: Repetition penalty setting (if specified)
 *   - applyParamsToConfig: Function to apply these parameters to an STS config
 *   - updateInstructionsUrlParam: Function to update instructions in the URL
 *   - updateVoiceUrlParam: Function to update voice selection in the URL
 */
export const useStsQueryParams = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * State containing the parsed query parameters
   */
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

  /**
   * Update params state when URL search parameters change
   */
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

  /**
   * Apply the current parameters to a provided STS configuration.
   * 
   * This function takes a base STS configuration and returns a new configuration
   * with the URL parameters applied as overrides.
   * 
   * @param {StsConfig} config - Base STS configuration to modify
   * @returns {StsConfig} Modified configuration with parameters applied
   */
  const applyParamsToConfig = useCallback(
    (config: StsConfig) => {
      const { voice, instructions, provider, model } = params;
      
      // Start with a deep copy of the config to avoid unintended mutations if config is used elsewhere
      const newConfig = JSON.parse(JSON.stringify(config));

      // Apply think provider and model from URL if both are present
      if (provider && model && newConfig.agent && newConfig.agent.think) {
        newConfig.agent.think.provider = { 
          type: provider, 
          model: model 
        };
      }

      // Apply instructions (to prompt) from URL if present
      if (instructions && newConfig.agent && newConfig.agent.think) {
        // Ensure prompt exists before appending. If not, initialize it.
        if (!newConfig.agent.think.prompt) {
          newConfig.agent.think.prompt = instructions;
        } else {
          newConfig.agent.think.prompt = `${newConfig.agent.think.prompt}\\n${instructions}`;
        }
      }

      // Apply voice (to speak.provider.model) from URL if present
      if (voice && newConfig.agent && newConfig.agent.speak && newConfig.agent.speak.provider) {
        newConfig.agent.speak.provider.model = voice;
      }
      
      // Note: 'temp' and 'rep_penalty' were removed as they are not standard 
      // for the default 'deepgram' speak provider in V1.
      // If you use other TTS providers via URL params that support these, 
      // this section would need to be conditional based on the provider type.

      return newConfig;
    },
    [params],
  );

  /**
   * Update a specific URL parameter and navigate to the new URL.
   * 
   * @param {string} param - The parameter name to update
   * @param {string|null} value - The value to set, or null to remove the parameter
   */
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

  /**
   * Update the "instructions" URL parameter
   * 
   * @param {string|null} text - The instructions text, or null to remove
   */
  const memoizedUpdateInstructionsUrlParam = useCallback(
    (text: string | null) => updateUrlParam("instructions", text),
    [updateUrlParam],
  );

  /**
   * Update the "voice" URL parameter
   * 
   * @param {string} voice - The voice model canonical name
   */
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
