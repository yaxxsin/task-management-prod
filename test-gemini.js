import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyBkNtnVKkY4tXFZQVvOyPrZmYDpZyRVXAE';

async function testGemini() {
    console.log('Testing Gemini 2.5 Flash API...\n');

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        console.log('Sending test request...');
        const result = await model.generateContent('Say hello in Indonesian!');
        const response = result.response.text();

        console.log('✅ API berfungsi dengan baik!');
        console.log('Response:', response);
    } catch (error) {
        console.log('❌ API Error:');
        console.log('Error Message:', error.message);
    }
}

testGemini();
