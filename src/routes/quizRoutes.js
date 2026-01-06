const express = require('express');
const quizGenerator = require('../services/quizGenerator');

const router = express.Router();

// Generate quiz from content
router.post('/generate', async (req, res, next) => {
  try {
    const {
      content,
      numberOfQuestions = 10,
      difficulty = 'medium',
      questionTypes = ['multiple-choice'],
      specificTopics = [],
      prioritizeImportant = true
    } = req.body;

    // Validate input
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content is required to generate quiz'
      });
    }

    if (numberOfQuestions < 1 || numberOfQuestions > 30) {
      return res.status(400).json({
        success: false,
        error: 'Number of questions must be between 1 and 30'
      });
    }

    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        error: 'Difficulty must be: easy, medium, or hard'
      });
    }

    const validQuestionTypes = ['multiple-choice', 'true-false', 'fill-in-blank', 'topic-specific'];
    const invalidTypes = questionTypes.filter(type => !validQuestionTypes.includes(type));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid question types: ${invalidTypes.join(', ')}`
      });
    }

    console.log(`🎯 Generating quiz: ${numberOfQuestions} questions, ${difficulty} difficulty`);

    const quiz = await quizGenerator.generateQuiz({
      content,
      numberOfQuestions,
      difficulty,
      questionTypes,
      specificTopics,
      prioritizeImportant
    });

    res.json({
      success: true,
      data: quiz
    });
  } catch (error) {
    next(error);
  }
});

// Analyze content for available topics
router.post('/analyze-topics', async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content is required for topic analysis'
      });
    }

    const topics = await quizGenerator.analyzeTopics(content);

    res.json({
      success: true,
      data: topics
    });
  } catch (error) {
    next(error);
  }
});

// Get detailed AI help for a question
router.post('/ai-help', async (req, res, next) => {
  try {
    const { question, correctAnswer, userAnswer, explanation, topic } = req.body;

    if (!question || !correctAnswer) {
      return res.status(400).json({
        success: false,
        error: 'Question and correct answer are required'
      });
    }

    console.log(`🤖 Generating AI help for question about: ${topic || 'general topic'}`);

    const detailedHelp = await quizGenerator.getDetailedExplanation({
      question,
      correctAnswer,
      userAnswer,
      explanation,
      topic
    });

    res.json({
      success: true,
      data: detailedHelp
    });
  } catch (error) {
    next(error);
  }
});

// Chat with AI tutor for follow-up questions
router.post('/ai-chat', async (req, res, next) => {
  try {
    const { question, correctAnswer, chatHistory, userMessage, topic } = req.body;

    if (!question || !correctAnswer || !userMessage) {
      return res.status(400).json({
        success: false,
        error: 'Question, correct answer, and user message are required'
      });
    }

    console.log(`💬 AI Chat: ${userMessage.substring(0, 50)}...`);

    const response = await quizGenerator.chatWithTutor({
      question,
      correctAnswer,
      chatHistory,
      userMessage,
      topic
    });

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
