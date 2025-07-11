import { GoogleGenerativeAI } from '@google/generative-ai';
import { promises as fs } from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

let resumeData = {};
const loadResumeData = async () => {
  try {
    // In a Vercel environment, the root directory might be different.
    // Assuming resume.json is at the root of the deployed project.
    const resumePath = path.join(process.cwd(), 'resume.json');
    const data = await fs.readFile(resumePath, 'utf8');
    resumeData = JSON.parse(data);
    console.log('Resume data loaded successfully.');
  } catch (error) {
    console.error('Failed to load resume data:', error);
  }
};

// Load resume data once when the function is initialized
loadResumeData();

export default async function handler(req, res) {
  
res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET','POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { message } = req.body;
  console.log(`Received message: ${message}`);

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set in environment variables.' });
  }

  if (Object.keys(resumeData).length === 0) {
    await loadResumeData(); // Attempt to reload if empty
    if (Object.keys(resumeData).length === 0) {
      return res.status(500).json({ error: 'Resume data not loaded.' });
    }
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are [Your Name] and respond as yourself in first person. You are helping users learn more about your resume, skills, experience, and projects.

    When providing data from the file make it feel more natural talking.

Keep answers clear and professional. If asked about something not in your resume or outside your knowledge, respond with:

"Great question! I'd be happy to chat more — just contact me directly."

Never refer to yourself as an AI or assistant.




${JSON.stringify(resumeData, null, 2)}

User message: "${message}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    res.json({ reply: text });
  } catch (error) {
    console.error('Error communicating with Gemini API:', error);
    res.status(500).json({ error: 'Failed to get response from Gemini API.' });
  }
}
