/**
 * Sample corpus data for testing and demonstration
 */

export const SAMPLE_CORPUS = `
The quick brown fox jumps over the lazy dog. Technology is transforming the way we live and work.
Machine learning and artificial intelligence are revolutionizing industries across the globe.
The future of computing lies in quantum mechanics and neural networks.
Software development requires creativity, problem-solving skills, and attention to detail.
Web applications have become increasingly sophisticated with modern JavaScript frameworks.
Cloud computing enables scalable and flexible infrastructure for businesses of all sizes.
Data science combines statistics, programming, and domain expertise to extract insights.
The internet has connected billions of people and transformed global communication.
Mobile devices have become essential tools for productivity and entertainment.
Cybersecurity is crucial for protecting sensitive information in the digital age.
Open source software promotes collaboration and innovation in the tech community.
Agile methodologies have improved software development processes and team collaboration.
User experience design focuses on creating intuitive and enjoyable digital products.
Blockchain technology promises to revolutionize finance and supply chain management.
Virtual reality and augmented reality are creating new possibilities for interaction.
The Internet of Things connects everyday devices to create smart environments.
Big data analytics helps organizations make data-driven decisions and predictions.
Natural language processing enables computers to understand and generate human language.
Robotics and automation are changing manufacturing and service industries.
Digital transformation is essential for businesses to remain competitive in today's market.
`;

export const TECHNICAL_CORPUS = `
JavaScript is a programming language that enables interactive web pages.
TypeScript extends JavaScript with static type checking and modern language features.
React is a JavaScript library for building user interfaces and single-page applications.
Node.js is a JavaScript runtime that allows server-side execution of JavaScript code.
Next.js is a React framework that provides server-side rendering and static site generation.
API endpoints handle HTTP requests and responses in web applications.
Database queries retrieve and manipulate data stored in relational or NoSQL databases.
Authentication systems verify user identity and manage access control.
Authorization determines what resources users can access based on their permissions.
Middleware functions process requests between the client and server.
State management libraries like Redux and Zustand handle application data flow.
Component libraries provide reusable UI elements for consistent design systems.
Testing frameworks ensure code quality through unit, integration, and end-to-end tests.
Deployment pipelines automate the process of building and releasing software.
Version control systems track changes to source code and enable collaboration.
Package managers install and manage dependencies for software projects.
Build tools compile and bundle source code for production deployment.
Performance optimization improves application speed and user experience.
Accessibility features ensure applications are usable by people with disabilities.
Security best practices protect applications from vulnerabilities and attacks.
`;

export const CONVERSATIONAL_CORPUS = `
Hello, how are you doing today? I hope you're having a wonderful day.
The weather is really nice outside, perfect for a walk in the park.
What do you think about the new restaurant that opened downtown?
I'm planning to visit my family this weekend for a birthday celebration.
The movie we watched last night was absolutely fantastic and entertaining.
Could you please help me with this project? I really appreciate your assistance.
Thank you so much for your kind words and thoughtful gesture.
I'm looking forward to our meeting tomorrow to discuss the new proposal.
The book I'm reading is quite interesting and full of unexpected plot twists.
Let's grab coffee sometime this week and catch up on everything.
I'm feeling a bit tired today, but I'm still motivated to get things done.
What are your plans for the upcoming holiday weekend?
The concert last night was amazing, the music was absolutely incredible.
I'm so excited about the upcoming vacation, it's going to be wonderful.
Could you recommend a good place to eat around here?
I really enjoyed our conversation yesterday, it was very insightful.
The traffic this morning was terrible, it took twice as long to get to work.
What's your favorite type of music? I'm always looking for new recommendations.
I'm grateful for all the support and encouragement you've given me.
Let's make sure we stay in touch and keep each other updated.
`;

export const MEDICAL_CORPUS = `
The patient presents with symptoms of fever and persistent cough.
Blood pressure readings indicate hypertension requiring medication management.
The diagnosis suggests a viral infection that should resolve within a week.
Treatment options include antibiotics for bacterial infections and rest for viral cases.
Regular exercise and healthy diet are essential for maintaining cardiovascular health.
The medical examination revealed no significant abnormalities in vital signs.
Prescription medications should be taken as directed by healthcare providers.
Preventive care includes regular check-ups and recommended vaccinations.
The surgical procedure was successful with no complications reported.
Rehabilitation therapy helps patients recover mobility and function after injury.
Mental health support is crucial for overall well-being and quality of life.
Chronic conditions require ongoing management and lifestyle modifications.
Emergency medical services provide immediate care for life-threatening situations.
Medical research continues to advance treatment options for various conditions.
Patient education empowers individuals to make informed healthcare decisions.
Healthcare providers work collaboratively to ensure comprehensive patient care.
Medical technology improves diagnostic accuracy and treatment effectiveness.
Public health initiatives promote community wellness and disease prevention.
`;

export const EDUCATIONAL_CORPUS = `
Learning is a lifelong process that continues throughout our entire lives.
Education provides the foundation for personal growth and career development.
Students benefit from interactive learning experiences and hands-on activities.
Teachers play a crucial role in inspiring curiosity and fostering knowledge.
Critical thinking skills enable individuals to analyze information and solve problems.
Research methods help students investigate topics and develop evidence-based conclusions.
Academic writing requires clear communication and proper citation of sources.
Collaborative learning encourages teamwork and diverse perspectives in education.
Technology integration enhances classroom engagement and learning outcomes.
Assessment strategies measure student progress and inform instructional decisions.
Curriculum development ensures educational content meets learning objectives.
Professional development helps educators stay current with best practices.
Student engagement is essential for effective learning and knowledge retention.
Educational leadership guides institutions toward excellence and innovation.
Learning disabilities require specialized support and individualized instruction.
Higher education prepares students for professional careers and advanced studies.
Online learning platforms provide flexible access to educational resources.
Academic integrity ensures honest and ethical behavior in educational settings.
`;

export const CORPUS_COLLECTIONS = {
  general: SAMPLE_CORPUS,
  technical: TECHNICAL_CORPUS,
  conversational: CONVERSATIONAL_CORPUS,
  medical: MEDICAL_CORPUS,
  educational: EDUCATIONAL_CORPUS,
};

export const CORPUS_METADATA = {
  general: {
    name: 'General Technology',
    description: 'Technology and software development focused corpus',
    wordCount: SAMPLE_CORPUS.split(/\s+/).length,
    topics: ['technology', 'software', 'development', 'AI', 'computing'],
  },
  technical: {
    name: 'Technical Programming',
    description: 'Programming and web development focused corpus',
    wordCount: TECHNICAL_CORPUS.split(/\s+/).length,
    topics: ['programming', 'JavaScript', 'React', 'web development', 'APIs'],
  },
  conversational: {
    name: 'Conversational English',
    description: 'Everyday conversation and social interaction corpus',
    wordCount: CONVERSATIONAL_CORPUS.split(/\s+/).length,
    topics: ['conversation', 'social', 'daily life', 'relationships', 'communication'],
  },
  medical: {
    name: 'Medical Terminology',
    description: 'Healthcare and medical terminology corpus',
    wordCount: MEDICAL_CORPUS.split(/\s+/).length,
    topics: ['healthcare', 'medical', 'patient care', 'diagnosis', 'treatment'],
  },
  educational: {
    name: 'Educational Content',
    description: 'Education and learning focused corpus',
    wordCount: EDUCATIONAL_CORPUS.split(/\s+/).length,
    topics: ['education', 'learning', 'teaching', 'academic', 'students'],
  },
};
