import { GoogleGenAI, Type } from "@google/genai";
import { getCurrentPosition } from "../services/location"; 

// Initialize using the Expo public environment variable format
const ai = new GoogleGenAI({
  apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY
});

export type Trail = {
  id: string;
  name: string;
  type: 'hike' | 'bike' | 'mixed';
  distanceMiles: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  area: string; 
  description: string;
  safetyTips: string[];
};

export const LOCAL_TRAILS: Trail[] = [];

/**
 * Gets the device's actual GPS coordinates, passes them to Gemini to
 * locate 2 to 5 nearby trails ANYWHERE in the world, and appends them to the list.
 */
export async function discoverNearbyTrailFromGPS(): Promise<void> {
  try {
    console.log("Fetching device location...");
    const position = await getCurrentPosition();
    
    if (!position) {
      throw new Error("Could not retrieve GPS coordinates. Make sure permissions are granted.");
    }

    const { latitude, longitude } = position;
    console.log(`Location found: ${latitude}, ${longitude}. Querying Gemini 3.5 for local trails...`);

    const response = await ai.models.generateContent({
      // Swapped to the Gemini 3.5 Flash model name
      model: "gemini-3.5-flash",
      contents: `You are a local trail expert mapping engine. Find between 2 to 5 real, specific distinct outdoor trails closest to these exact GPS coordinates: Latitude ${latitude}, Longitude ${longitude}. Identify the true local city/neighborhood name for the 'area' field. Provide accurate details for each trail.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "A list of 2 to 5 distinct trails found near the user's location.",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Placeholder ID string." },
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["hike", "bike", "mixed"] },
              distanceMiles: { type: Type.NUMBER },
              difficulty: { type: Type.STRING, enum: ["Easy", "Moderate", "Hard"] },
              area: { type: Type.STRING, description: "The specific local neighborhood, city, or state park name" },
              description: { type: Type.STRING },
              safetyTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["id", "name", "type", "distanceMiles", "difficulty", "area", "description", "safetyTips"],
          }
        }
      }
    });

    if (response.text) {
      const newTrails: Trail[] = JSON.parse(response.text);
      
      newTrails.forEach((trail) => {
        trail.id = (LOCAL_TRAILS.length + 1).toString();
        LOCAL_TRAILS.push(trail);
        console.log(`Success! Added "${trail.name}" located in ${trail.area}`);
      });
    }
    
  } catch (error) {
    console.error("Error discovering nearby trails:", error);
  }
}