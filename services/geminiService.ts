
import { GoogleGenAI, Type } from "@google/genai";
import { SimulationOutput, PricingVariant, GlobalAssumptions } from "../types";

// Fixing type errors by using correct interfaces from types.ts and adjusting data mapping logic.
export const getAIAnalysis = async (
  results: SimulationOutput,
  variants: PricingVariant[],
  assumptions: GlobalAssumptions
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Find control group data to calculate relative performance (lift)
  const controlResult = results.results.find(r => {
    const v = variants.find(variant => variant.id === r.variantId);
    return v?.isControl;
  });

  const variantContext = variants.map(v => {
    const result = results.results.find(r => r.variantId === v.id);
    
    // Calculate performance lift metrics vs the control variant
    const revenueLift = controlResult && controlResult.revenue !== 0 && result
      ? ((result.revenue - controlResult.revenue) / controlResult.revenue) * 100 
      : 0;
    
    const controlConvRate = controlResult && controlResult.visitors !== 0 
      ? controlResult.conversions / controlResult.visitors 
      : 0;
    const variantConvRate = result && result.visitors !== 0 
      ? result.conversions / result.visitors 
      : 0;
    const conversionLift = controlConvRate !== 0 && variantConvRate !== undefined
      ? ((variantConvRate - controlConvRate) / controlConvRate) * 100 
      : 0;

    return `
      Variant: ${v.name} (${v.isControl ? 'CONTROL' : 'TEST'})
      Price: ${v.price} / ${v.billingCycle}
      Notes: ${v.notes || 'None'}
      Total Revenue: $${result?.revenue.toFixed(2) || '0.00'}
      Total Conversions: ${result?.conversions.toFixed(0) || '0'}
      ARPU: $${result?.arpu.toFixed(2) || '0.00'}
      Revenue Lift vs Control: ${revenueLift.toFixed(2)}%
      Conversion Lift vs Control: ${conversionLift.toFixed(2)}%
    `;
  }).join('\n');

  const prompt = `
    As a Senior Product Manager and Pricing Strategist, analyze the following A/B/n experiment results and provide a recommendation.
    
    EXPERIMENT SETUP & RESULTS:
    ${variantContext}
    
    Context: The experiment simulation was based on ${assumptions.monthlyTraffic} monthly traffic.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendation: {
            type: Type.STRING,
            description: "ROLL_OUT, REJECT, or INCONCLUSIVE",
          },
          executiveSummary: {
            type: Type.STRING,
            description: "A 2-3 sentence overview of the outcome.",
          },
          pros: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          cons: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          riskAssessment: {
            type: Type.STRING,
            description: "Potential downsides or things to watch for.",
          }
        },
        required: ["recommendation", "executiveSummary", "pros", "cons", "riskAssessment"]
      },
      systemInstruction: "You are a world-class pricing expert for B2B SaaS. Your goal is to maximize long-term LTV and market share while balancing short-term revenue goals. Be critical and evidence-based. If multiple test variants exist, compare them against each other and the control."
    },
  });

  try {
    // Accessing .text property directly as per guidelines (not .text())
    return JSON.parse(response.text.trim());
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return null;
  }
};
