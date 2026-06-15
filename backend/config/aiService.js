import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `
You are "Aura", the intelligent AI Health Assistant for Prescripto Hospital. 
Your goal is to guide patients, answer general medical inquiries, and assist them with hospital services. 
Rules:
1. Always maintain a warm, highly professional, and reassuring tone.
2. Provide a medical disclaimer when answering symptom-related queries: "I am an AI assistant and cannot replace professional medical advice. For severe symptoms, please visit our ER or consult a specialist."
3. Guide users on hospital features:
   - To book an appointment, go to the "ALL DOCTORS" tab, select a doctor, and pick a slot.
   - To check ward admissions, go to "My Admissions" in the profile menu.
   - If they have billing or tech support questions, tell them they can create an Email Support Ticket or ask to speak to a human.
4. If the user explicitly asks to speak to a human, agent, doctor, or needs urgent administrative help, respond with: "Certainly! I am transferring you to a live support agent now. They will reply shortly in this inbox." and include "[HUMAN_TRANSFER]" at the very end of your response.
5. Keep your responses relatively concise and easy to read.
`;

/**
 * Local dialog engine that simulates Aura if no Gemini API key is configured.
 */
const mockAuraDialogue = (userMessage, history = []) => {
    const msg = userMessage.toLowerCase();
    
    // Check for human handoff intent
    if (msg.includes("human") || msg.includes("agent") || msg.includes("support") || msg.includes("speak to") || msg.includes("talk to") || msg.includes("doctor chat") || msg.includes("help")) {
        return {
            text: "Certainly! I am transferring you to a live support agent now. They will reply shortly in this inbox. [HUMAN_TRANSFER]",
            suggestedReplies: ["🙋 Show Ticket Hub", "📞 Contact Info"]
        };
    }
    
    // Appointment keywords
    if (msg.includes("appointment") || msg.includes("book") || msg.includes("slot") || msg.includes("visit")) {
        return {
            text: "To book an appointment at Prescripto:\n1. Click on 'ALL DOCTORS' in the navigation bar.\n2. Choose your preferred speciality or doctor.\n3. Scroll down to select an available time slot and click 'Book Appointment'.\n\nWould you like me to guide you to our doctor list?",
            suggestedReplies: ["🧑‍⚕️ Show Doctor List", "📅 View My Appointments"]
        };
    }

    // Admission keywords
    if (msg.includes("admit") || msg.includes("admission") || msg.includes("bed") || msg.includes("ward") || msg.includes("inpatient")) {
        return {
            text: "At Prescripto, we offer premium General, Private, and ICU wards. If you or a family member are currently admitted, you can track active admission statuses, assigned beds, daily treatment notes, and final billing summaries under the 'My Admissions' tab in your Profile dropdown.",
            suggestedReplies: ["🛏️ View My Admissions", "💳 Check Billing"]
        };
    }

    // Symptom check keywords
    if (msg.includes("fever") || msg.includes("headache") || msg.includes("pain") || msg.includes("cough") || msg.includes("cold") || msg.includes("stomach") || msg.includes("sick")) {
        return {
            text: "I'm sorry to hear you're feeling unwell. *Disclaimer: I am your AI Assistant and cannot replace professional medical advice. For emergencies, please call local ambulance services immediately.*\n\nFor symptoms like this, resting and drinking fluids is generally recommended. I highly recommend booking a consultation with one of our experienced doctors for a proper diagnosis.",
            suggestedReplies: ["🧑‍⚕️ Find a Doctor", "🙋 Transfer to Agent"]
        };
    }

    // Billing check keywords
    if (msg.includes("billing") || msg.includes("fee") || msg.includes("charge") || msg.includes("payment") || msg.includes("cost") || msg.includes("stripe") || msg.includes("razorpay")) {
        return {
            text: "Prescripto supports secure online payments via Stripe and Razorpay. Appointment and admission fees can be settled directly through the respective dashboards. For complex billing discrepancies, you can generate a support ticket.",
            suggestedReplies: ["🙋 Open Support Ticket", "📞 Call Hospital"]
        };
    }

    // Greetings
    if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("greetings") || msg.includes("aura")) {
        return {
            text: "Hello! I am Aura, your Prescripto AI Health Assistant. How can I help you today? You can ask me about symptoms, booking appointments, ward admissions, or request to speak to a human support agent.",
            suggestedReplies: ["📅 Book Appointment", "🛏️ Check Wards", "🙋 Speak to Agent"]
        };
    }

    // Thank you
    if (msg.includes("thank") || msg.includes("thanks") || msg.includes("perfect") || msg.includes("awesome")) {
        return {
            text: "You're very welcome! If you need anything else, just ask. Have a healthy and wonderful day!",
            suggestedReplies: ["📅 Book Appointment", "🙋 Speak to Agent"]
        };
    }

    // Default response
    return {
        text: "I understand. I am here to help you navigate our services. I can answer questions about appointment scheduling, bed admissions, general health guidelines, or transfer you to a real human support desk. What would you like to do?",
        suggestedReplies: ["📅 Book Appointment", "🛏️ Check Admissions", "🙋 Speak to Agent"]
    };
};

/**
 * Generate AI Response using Gemini API or smart local fallback.
 * @param {string} userMessage - The raw text message sent by the user.
 * @param {Array} history - Array of previous messages in format [{role: 'user'|'model', parts: [{text: string}]}]
 */
export const generateAIResponse = async (userMessage, history = []) => {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey.includes("your_api_key") || apiKey === "") {
        console.log("[AI Assistant] GEMINI_API_KEY not configured. Falling back to local smart dialogue engine.");
        // Simulate a tiny thinking delay for realism (e.g. 800ms)
        await new Promise(resolve => setTimeout(resolve, 800));
        return mockAuraDialogue(userMessage, history);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // Using gemini-1.5-flash as the standard robust model
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: SYSTEM_PROMPT 
        });

        const chat = model.startChat({
            history: history.map(h => ({
                role: h.senderType === 'user' ? 'user' : 'model',
                parts: [{ text: h.content }]
            }))
        });

        const result = await chat.sendMessage(userMessage);
        const responseText = result.response.text();
        
        // Formulate suggested replies based on response content
        const suggestedReplies = [];
        const lowerRes = responseText.toLowerCase();
        if (lowerRes.includes("appointment") || lowerRes.includes("doctor")) {
            suggestedReplies.push("📅 Book Appointment");
        }
        if (lowerRes.includes("admission") || lowerRes.includes("ward")) {
            suggestedReplies.push("🛏️ Wards Admissions");
        }
        if (lowerRes.includes("ticket") || lowerRes.includes("support")) {
            suggestedReplies.push("🙋 Open Ticket");
        }
        if (!lowerRes.includes("transferring you")) {
            suggestedReplies.push("🙋 Speak to Agent");
        } else {
            suggestedReplies.push("📞 Support Contact");
        }

        return {
            text: responseText,
            suggestedReplies: suggestedReplies.slice(0, 3)
        };

    } catch (error) {
        console.error("[AI Assistant] Gemini API generation error:", error);
        return mockAuraDialogue(userMessage, history);
    }
};
