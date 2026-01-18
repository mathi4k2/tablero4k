
import { GoogleGenAI } from "@google/genai";
import { MatchState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMatchCommentary = async (state: MatchState): Promise<string> => {
  try {
    const prompt = `Act as an enthusiastic sports commentator. 
    Match: ${state.matchTitle}
    Team A (${state.teamA.name}): ${state.teamA.score}
    Team B (${state.teamB.name}): ${state.teamB.score}
    Give a one-sentence witty and exciting update about the current state of this match in Spanish.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "¡Qué partido tan emocionante!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "¡La tensión se siente en el aire!";
  }
};
