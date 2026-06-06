import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

async function main() {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: "Explain how AI works in a few words",
  });
  console.log(response.text);
}

await main();

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

/*
ToDO
Make function to 
Get location data, provide it to gemini and prompt engineer to have it identify trails, provide ID, Name
type, distance, difficulty, area, description, and tips 
every time this function is called create a new trail type in the AUSTIN_TRAILS
*/

export const AUSTIN_TRAILS: Trail[] = [
  {
    id: '1',
    name: 'Lady Bird Lake Hike and Bike Trail',
    type: 'mixed',
    distanceMiles: 10,
    difficulty: 'Easy',
    area: 'Downtown Austin',
    description:
      'A scenic trail that loops around Lady Bird Lake, offering beautiful views of the city skyline. Perfect for walking, jogging, biking, and rollerblading.',
    safetyTips: [
      'Stay on designated paths to avoid wildlife encounters.',
      'Be cautious of cyclists if you are walking or jogging.',
      'Carry water, especially during hot weather.',
    ],
  }
];