
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini API with the mandatory apiKey parameter from process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getPricingSuggestions(projectName: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a structured cost estimation for a project: "${projectName}". 
      Include typical materials with estimated unit prices and quantities. 
      Estimate labor hours. 
      Suggest a standard industry profit margin percentage and a typical tax rate for this specific industry and project type.
      Provide a 'context' field explaining the reasoning behind the chosen margin and tax rates (e.g., "Standard VAT for residential construction in most regions").`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            materials: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER }
                },
                required: ["name", "quantity", "unitPrice"]
              }
            },
            laborHours: { type: Type.NUMBER },
            suggestedMargin: { 
              type: Type.NUMBER, 
              description: "Standard industry profit margin percentage for this project." 
            },
            suggestedTax: { 
              type: Type.NUMBER, 
              description: "Typical tax or VAT rate for this service." 
            },
            context: { 
              type: Type.STRING, 
              description: "Brief reasoning for the suggested profit and tax rates." 
            }
          },
          required: ["materials", "laborHours", "suggestedMargin", "suggestedTax", "context"]
        }
      }
    });

    // Access the .text property directly (not as a method) to extract the generated response.
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Estimation Error:", error);
    return null;
  }
}
