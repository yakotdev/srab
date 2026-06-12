import type { ThemeConfig, LayoutSection, Product } from '../types';

async function loadGenaiModule() {
  return import('@google/genai');
}

export const generateProductDescription = async (
  productName: string,
  keywords: string,
  language: 'ar' | 'en' = 'ar',
): Promise<string> => {
  const { GoogleGenAI } = await loadGenaiModule();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt =
      language === 'ar'
        ? `اكتب وصفًا تسويقيًا جذابًا لمنتج تجارة إلكترونية باسم "${productName}". استخدم الكلمات المفتاحية: ${keywords}. اجعل الوصف أقل من 100 كلمة وباللغة العربية الفصحى المعاصرة.`
        : `Write a compelling, SEO-friendly e-commerce product description for a product named "${productName}". Use these keywords: ${keywords}. Keep it under 100 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || 'Failed to generate description.';
  } catch (error) {
    console.error('Gemini Error:', error);
    return 'Error generating content. Please try again.';
  }
};

export const generateThemeConfig = async (
  prompt: string,
  _currentLayout: LayoutSection[],
): Promise<Partial<ThemeConfig> | null> => {
  const { GoogleGenAI, Type } = await loadGenaiModule();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a professional UI/UX designer. Create a JSON theme configuration for an online store based on this description: "${prompt}".
      
      Return ONLY a JSON object with this schema:
      {
        "primaryColor": "hex code",
        "secondaryColor": "hex code",
        "borderRadius": "sm/md/lg/full",
        "fontFamily": "cairo" (always prefer cairo for this request)
      }
      `,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryColor: { type: Type.STRING },
            secondaryColor: { type: Type.STRING },
            borderRadius: { type: Type.STRING },
            fontFamily: { type: Type.STRING, enum: ['sans', 'serif', 'cairo'] },
          },
          required: ['primaryColor', 'secondaryColor', 'borderRadius', 'fontFamily'],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) return null;
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Gemini Theme Error:', error);
    return null;
  }
};

export const chatWithStore = async (
  userMessage: string,
  products: Product[],
  language: 'ar' | 'en',
): Promise<string> => {
  const { GoogleGenAI } = await loadGenaiModule();
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const inventoryContext = products.map((p) => `${p.name} (${p.price}): ${p.description}`).join('\n');

    const systemInstruction =
      language === 'ar'
        ? `أنت مساعد ذكي لمتجر إلكتروني. هدفك مساعدة العملاء في العثور على المنتجات.
         إليك قائمة المنتجات المتاحة في المتجر:
         ${inventoryContext}
         
         أجب على أسئلة العميل باختصار ولطافة. اقترح منتجات من القائمة إذا كانت مناسبة. لا تخترع منتجات غير موجودة.`
        : `You are a smart AI assistant for an online store. Your goal is to help customers find products.
         Here is the list of available products:
         ${inventoryContext}
         
         Answer customer questions concisely and politely. Recommend products from the list if relevant. Do not invent products that do not exist.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userMessage,
      config: {
        systemInstruction,
      },
    });

    return response.text || (language === 'ar' ? 'عذراً، لم أفهم ذلك.' : "Sorry, I didn't catch that.");
  } catch (error) {
    console.error('Gemini Chat Error:', error);
    return language === 'ar' ? 'حدث خطأ في الاتصال.' : 'Connection error.';
  }
};
