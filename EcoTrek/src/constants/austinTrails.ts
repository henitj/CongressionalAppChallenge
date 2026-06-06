import { GoogleGenAI, Type } from "@google/genai";
import { getCurrentPosition } from "../services/location"; 

const ai = new GoogleGenAI({});

export type Trail = {
  id: string;
  name: string;
  type: 'hike' | 'bike' | 'mixed';
  distanceMiles: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  area: string; // This will now hold whatever city/region they are actually in
  description: string;
  safetyTips: string[];
};

// 1. Rename to a generic list and start it completely empty!
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
    console.log(`Location found: ${latitude}, ${longitude}. Querying Gemini for local trails...`);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      // 2. Updated the prompt to be completely location-agnostic
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
        // Safe sequential ID generation matching the new generic array
        trail.id = (LOCAL_TRAILS.length + 1).toString();
        LOCAL_TRAILS.push(trail);
        console.log(`Success! Added "${trail.name}" located in ${trail.area}`);
      });
    }
    
  } catch (error) {
    console.error("Error discovering nearby trails:", error);
  }
}