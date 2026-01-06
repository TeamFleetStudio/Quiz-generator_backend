const OpenAI = require('openai');

class QuizGenerator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Generate quiz from content
   * @param {Object} options - Quiz generation options
   * @returns {Promise<Object>} Generated quiz
   */
  async generateQuiz(options) {
    const {
      content,
      numberOfQuestions,
      difficulty,
      questionTypes,
      specificTopics,
      prioritizeImportant
    } = options;

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt({
      content,
      numberOfQuestions,
      difficulty,
      questionTypes,
      specificTopics,
      prioritizeImportant
    });

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      console.log(`✅ Generated ${result.questions?.length || 0} questions`);
      
      return {
        quiz: result,
        metadata: {
          totalQuestions: result.questions?.length || 0,
          difficulty,
          questionTypes,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Quiz generation error:', error);
      throw new Error(`Failed to generate quiz: ${error.message}`);
    }
  }

  /**
   * Analyze content to extract available topics
   * @param {string} content - Educational content
   * @returns {Promise<Object>} Extracted topics
   */
  async analyzeTopics(content) {
    const prompt = `Analyze the following educational content and identify the main topics, concepts, and key areas covered. Return a JSON object with:
- topics: array of main topic names
- keyConcepts: array of important concepts/definitions
- suggestedDifficulty: recommended difficulty level based on content complexity

Educational Content:
${content.substring(0, 8000)}

Return valid JSON only.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Topic analysis error:', error);
      throw new Error(`Failed to analyze topics: ${error.message}`);
    }
  }

  /**
   * Get detailed explanation for a question (AI Help feature)
   * @param {Object} questionData - Question details
   * @returns {Promise<Object>} Detailed explanation
   */
  async getDetailedExplanation(questionData) {
    const { question, correctAnswer, userAnswer, explanation, topic } = questionData;

    const prompt = `You are a friendly and patient tutor helping a student understand a concept they got wrong on a quiz.

The student answered this question incorrectly and needs help understanding why the correct answer is right.

QUESTION: ${question}

CORRECT ANSWER: ${correctAnswer}

STUDENT'S ANSWER: ${userAnswer || '(No answer provided)'}

ORIGINAL EXPLANATION: ${explanation}

${topic ? `TOPIC: ${topic}` : ''}

Please provide a detailed, easy-to-understand explanation that:
1. Starts with a friendly, encouraging tone
2. Explains the concept in simple terms, as if teaching a beginner
3. Uses real-world analogies or examples to make it relatable
4. Breaks down WHY the correct answer is right step by step
5. If the student gave a wrong answer, gently explains why that answer is incorrect
6. Provides a memory tip or trick to remember this concept
7. Ends with a brief summary

Use clear paragraphs and make it conversational. Don't use complex jargon.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const detailedExplanation = response.choices[0].message.content;
      
      console.log(`✅ AI Help generated for topic: ${topic || 'general'}`);

      return {
        detailedExplanation,
        question,
        correctAnswer,
        topic
      };
    } catch (error) {
      console.error('AI Help error:', error);
      throw new Error(`Failed to get AI help: ${error.message}`);
    }
  }

  /**
   * Chat with AI tutor for follow-up questions
   * @param {Object} options - Chat options
   * @returns {Promise<Object>} AI response
   */
  async chatWithTutor(options) {
    const { question, correctAnswer, chatHistory, userMessage, topic } = options;

    const systemPrompt = `You are a friendly, patient AI tutor helping a student understand a quiz question they got wrong or are confused about.

QUESTION CONTEXT:
- Question: ${question}
- Correct Answer: ${correctAnswer}
- Topic: ${topic || 'General'}

GUIDELINES:
1. Be encouraging and supportive - never make the student feel bad
2. Explain concepts in simple terms
3. Use analogies and real-world examples
4. If they ask for more examples, provide different ones
5. If they're still confused, try a completely different approach
6. Keep responses conversational but educational
7. Use emojis occasionally to be friendly 😊
8. If they understand, congratulate them!
9. Answer any follow-up questions they have about this topic

Remember: Your goal is to help them truly understand, not just memorize.`;

    // Build messages array with chat history
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // Add chat history
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.8,
        max_tokens: 1000
      });

      return {
        message: response.choices[0].message.content
      };
    } catch (error) {
      console.error('Chat error:', error);
      throw new Error(`Failed to chat with AI: ${error.message}`);
    }
  }

  /**
   * Build system prompt for quiz generation
   * @returns {string} System prompt
   */
  buildSystemPrompt() {
    return `You are an expert educational quiz generator. Your task is to create high-quality, pedagogically sound quiz questions from educational content.

Guidelines:
1. Each question must be clear, unambiguous, and directly related to the content
2. Questions should test understanding, not just memorization
3. For multiple-choice questions, create 4 plausible options with exactly one correct answer
4. Distractors (wrong options) should be plausible but clearly incorrect
5. Provide concise but thorough explanations for correct answers
6. Vary question difficulty according to the specified level
7. Cover diverse concepts from the content
8. Ensure questions are grammatically correct and professionally written

Output Format - Return a valid JSON object with this structure:
{
  "title": "Quiz title based on content",
  "description": "Brief description of what this quiz covers",
  "questions": [
    {
      "id": 1,
      "type": "multiple-choice|true-false|fill-in-blank",
      "difficulty": "easy|medium|hard",
      "topic": "Specific topic this question covers",
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"], // For MCQ
      "correctAnswer": "The correct answer or option letter",
      "explanation": "Clear explanation of why this answer is correct"
    }
  ]
}`;
  }

  /**
   * Build user prompt for quiz generation
   * @param {Object} options - Generation options
   * @returns {string} User prompt
   */
  buildUserPrompt(options) {
    const {
      content,
      numberOfQuestions,
      difficulty,
      questionTypes,
      specificTopics,
      prioritizeImportant
    } = options;

    let prompt = `Generate a quiz with exactly ${numberOfQuestions} questions from the following educational content.

REQUIREMENTS:
- Difficulty Level: ${difficulty.toUpperCase()}
- Question Types: ${questionTypes.join(', ')}
${specificTopics.length > 0 ? `- Focus on these topics: ${specificTopics.join(', ')}` : '- Cover all major topics from the content'}
${prioritizeImportant ? '- Prioritize frequently mentioned and high-importance concepts' : ''}

DIFFICULTY GUIDELINES:
- Easy: Basic recall, definitions, simple facts
- Medium: Application of concepts, understanding relationships
- Hard: Analysis, synthesis, complex problem-solving

QUESTION TYPE SPECIFICATIONS:
`;

    if (questionTypes.includes('multiple-choice')) {
      prompt += `- Multiple Choice: 4 options (A, B, C, D), one correct answer
`;
    }
    if (questionTypes.includes('true-false')) {
      prompt += `- True/False: Statement that is clearly true or false
`;
    }
    if (questionTypes.includes('fill-in-blank')) {
      prompt += `- Fill in the Blank: Sentence with key term removed, indicated by _____
`;
    }
    if (questionTypes.includes('topic-specific')) {
      prompt += `- Topic-Specific: Deep questions on specific topics mentioned
`;
    }

    prompt += `
EDUCATIONAL CONTENT:
---
${content.substring(0, 12000)}
---

Generate the quiz now. Ensure all ${numberOfQuestions} questions are unique and well-distributed across the content. Return valid JSON only.`;

    return prompt;
  }
}

module.exports = new QuizGenerator();
