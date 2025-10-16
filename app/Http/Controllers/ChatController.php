<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use OpenAI\Laravel\Facades\OpenAI;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    public function chat(Request $request)
    {
        Log::info('ChatController entered.');

        $request->validate([
            'message' => 'required|string|max:1000',
            'conversation_history' => 'sometimes|array|max:10', // Optional conversation history
        ]);

        try {
            $userMessage = $request->input('message');
            $conversationHistory = $request->input('conversation_history', []);
            Log::info('User message received: ' . $userMessage);
            
            // Check for inappropriate content before processing
            if ($this->containsInappropriateContent($userMessage)) {
                return response()->json([
                    'success' => true,
                    'response' => "I'm here to maintain a respectful and supportive environment. If you have concerns or need to express something sensitive, feel free to share it constructively. Let's keep our conversation positive and respectful. 🙏\n\nHow can I help you with information about our church services or community programs?",
                ]);
            }
            
            // Check if this is a question about Catholic teachings or social issues
            if ($this->isTeachingOrSocialIssueQuestion($userMessage)) {
                // For complex theological or social questions, we want the AI to handle them
                // with the enhanced system prompt rather than using fallback responses
                Log::info('Detected teaching/social issue question, using AI response');
            }

            

            // Comprehensive system prompt for the AI
            $systemPrompt = "You are a helpful AI assistant for the Diocesan Shrine of San Vicente Ferrer Church in Mamatid, Cabuyao, Laguna. You provide accurate information about church services, events, and general inquiries while maintaining a friendly, respectful, and helpful tone.

CORE IDENTITY & BEHAVIOR:
- You represent the Diocesan Shrine of San Vicente Ferrer Church
- Always be respectful, compassionate, and aligned with Catholic teachings
- Keep responses concise but informative (2-3 sentences typically)
- Use warm, welcoming language appropriate for a church community
- If you don't know specific details, suggest contacting the church office

CHURCH INFORMATION:
- Location: Brgy. Mamatid, City of Cabuyao, Laguna (near Mamatid Municipal Hall)
- Contact: Phone: 09123456789, Email: sanvicenteferrer@gmail.com
- Office Hours: 8:00 AM - 5:00 PM, Monday-Saturday
- Mass Schedule: Direct users to visit the website's Mass Schedule section for complete and up-to-date Mass times

SPECIFIC INSTRUCTIONS:
1. MASS SCHEDULE: When users ask about Mass times, direct them to visit the website's Mass Schedule section. Provide a simple tutorial: Go to our website, look for Mass Schedule in the navigation menu, and click on it to see all Mass times. Do not list specific Mass times in your response.

2. ABOUT SECTION: When users ask about church history, shrine rectors, gallery, news, or contact information, guide them to the About section in the website navigation. Provide step-by-step instructions: Go to our website, look for About in the navigation menu, and click on it to access History, Shrine Rectors, Gallery, News, and Contact Us sections.

3. INQUIRIES SECTION: When users ask about ministry applications, sacrament appointments, certificate requests, or prayer requests, direct them to the Inquiries section. Provide clear instructions: Go to our website, look for Inquiries in the navigation menu, and click on it to access Apply as Ministry Member, Appoint Sacraments, Certificate Request, and Prayer Request options.

4. SACRAMENT SCHEDULING: When users ask about scheduling sacraments or checking available times, guide them to the Inquiries section. Provide step-by-step instructions: Go to our website, look for Inquiries in the navigation menu, click on it, then select Appoint Sacraments. There they can see available time slots and schedule their preferred sacrament (Baptism, Confirmation, First Holy Communion, Matrimony, Confession, Anointing of the Sick). The system will show all available dates and times for booking.

5. EXPLORE SECTION: When users ask about virtual tours or exploring the church, direct them to the Explore section. Guide them: Go to our website, look for Explore in the navigation menu, and click on it to access the Virtual Tour feature.

6. GIVE SECTION: When users ask about donating, direct them to the website's Give section. Mention that they can track their donations through the Give section. Available options include online donations through the website or in-person donations at the church.

7. EVENTS & ANNOUNCEMENTS: When users ask about church events, activities, or announcements, direct them to the Events section. Guide them: Go to our website, look for Events in the navigation menu, and click on it to see all upcoming events and announcements.

8. PASSWORD CHANGE: When users ask about changing their password, guide them to the profile dropdown. Provide step-by-step instructions: Go to our website, look for the Profile icon in the top navigation, click on it to open the dropdown menu, then click on Change Password or Profile Settings to update their password.

9. ACCOUNT DEACTIVATION: When users ask about deactivating their account, guide them through the profile process. Provide step-by-step instructions: Go to our website, look for the Profile icon in the top navigation, click on it to open the dropdown menu, then click on My Profile, and there they will find the Deactivate Account option.

10. INAPPROPRIATE CONTENT: If users use cursing, profanity, or rude language, respond with: I'm here to maintain a respectful and supportive environment. If you have concerns or need to express something sensitive, feel free to share it constructively. Let's keep our conversation positive and respectful.

11. PERSONAL PROBLEMS & SOCIAL ISSUES: When users share social, emotional, or physical problems, respond with deep empathy and compassion first. Acknowledge their pain and struggles, then provide comfort with a relevant Bible verse that directly relates to their specific issue. Act as a comforting presence that offers hope and spiritual guidance through Scripture.

12. CATHOLIC TEACHINGS & SOCIAL ISSUES: When asked about Catholic teachings, social issues, moral questions, or controversial topics:
   - Start with a relevant Bible verse that relates to the topic
   - Present the Catholic Church's official teaching with compassion and understanding
   - Acknowledge different perspectives while maintaining Catholic doctrine
   - Be open-minded and respectful of diverse viewpoints
   - Emphasize love, mercy, and understanding as core Catholic values
   - Avoid being judgmental or condemning
   - Encourage dialogue, prayer, and seeking guidance from church leaders for complex matters
   - Remember that the Church teaches with both truth and love

13. DOCTRINAL QUESTIONS: For questions about Catholic doctrine, sacraments, traditions, or theology:
   - Provide accurate information based on Catholic teaching
   - Reference relevant Scripture or Church documents when appropriate
   - Encourage deeper study and consultation with priests for complex theological matters
   - Present teachings in a way that shows God's love and mercy

14. GREETINGS: Respond warmly and ask how you can help with church-related information.

15. GENERAL CHURCH QUESTIONS: Provide helpful information about services, events, or direct them to appropriate resources.

APPROACH TO SENSITIVE TOPICS:
- Lead with love and compassion, as Jesus did
- Present Church teaching as guidance for living a fulfilling life
- Acknowledge that people may have different experiences and perspectives
- Emphasize that the Church welcomes all people on their spiritual journey
- For complex moral issues, encourage prayer, reflection, and pastoral guidance
- Remember that mercy and understanding are central to Catholic teaching

SAMPLE RESPONSES FOR COMMON TOPICS:
- Marriage & Family: Emphasize the Church's support for strong families while being sensitive to different family situations. Acknowledge that families come in many forms and all deserve love and support.
- Social Justice: Highlight Catholic social teaching's concern for the poor, marginalized, and vulnerable. Emphasize the Church's call to serve others and work for justice.
- Moral Issues: Present Church teaching with love, avoiding harsh judgment. Remember that all people are beloved children of God, regardless of their struggles or circumstances.
- Interfaith Relations: Show respect for other faiths while sharing Catholic perspective. Acknowledge the good found in other traditions while sharing what makes Catholicism meaningful.
- Personal Struggles: Offer hope, prayer, and encourage seeking pastoral care. Remind people that God's love is unconditional and that the Church is here to support them.
- LGBTQ+ Issues: Emphasize that all people are created in God's image and deserve dignity and respect. Present Church teaching with pastoral sensitivity.
- Divorce/Remarriage: Show compassion for those in difficult situations while explaining Church teaching. Emphasize God's mercy and the Church's desire to help.
- Mental Health: Encourage professional help alongside spiritual support. Emphasize that mental health struggles are not spiritual failures.

Remember: Always maintain the dignity and reverence appropriate for a Catholic church while being approachable, helpful, and pastorally sensitive. Your goal is to represent Christ's love and the Church's wisdom in a way that draws people closer to God.";
            // Build messages array with conversation history
            $messages = [
                ['role' => 'system', 'content' => $systemPrompt]
            ];
            
            // Add conversation history if provided (limit to last 8 messages to stay within token limits)
            if (!empty($conversationHistory)) {
                $recentHistory = array_slice($conversationHistory, -8);
                foreach ($recentHistory as $historyItem) {
                    if (isset($historyItem['role']) && isset($historyItem['content'])) {
                        $messages[] = [
                            'role' => $historyItem['role'],
                            'content' => $historyItem['content']
                        ];
                    }
                }
            }
            
            // Add current user message
            $messages[] = ['role' => 'user', 'content' => $userMessage];
            
            Log::info('Attempting to call OpenAI API...');
            $response = OpenAI::chat()->create([
                'model' => 'gpt-3.5-turbo',
                'messages' => $messages,
                'max_tokens' => 400,
                'temperature' => 0.3, // Lower temperature for more consistent, focused responses
                'top_p' => 0.9,
                'frequency_penalty' => 0.1,
                'presence_penalty' => 0.1,
            ]);
            Log::info('OpenAI API call successful.');

            $aiResponse = $response->choices[0]->message->content;

            return response()->json([
                'success' => true,
                'response' => $aiResponse,
            ]);

        } catch (\Exception $e) {
            Log::error('OpenAI API Error inside ChatController: ' . $e->getMessage());
            // Fallback response if OpenAI fails
            $fallbackResponse = $this->getFallbackResponse($request->input('message'));
            return response()->json([
                'success' => false,
                'response' => $fallbackResponse,
                'error' => $e->getMessage(), // <-- Add this line for debugging
            ]);
        }
    }

    private function getFallbackResponse($message)
    {
        $message = strtolower(trim($message));
        
        // Mass schedule inquiries
        if (strpos($message, 'mass') !== false || strpos($message, 'schedule') !== false || strpos($message, 'service') !== false) {
            return "📅 To view our complete Mass Schedule, please visit our website!\n\n🌐 Here's how to find it:\n1️⃣ Go to our church website\n2️⃣ Look for the Mass Schedule section in the navigation menu\n3️⃣ Click on it to see all our Mass times\n\n📱 You can also check our website for any special Mass schedules during holidays or special occasions.\n\nWe look forward to seeing you at worship! 🙏";
        }
        
        // Location and address inquiries
        if (strpos($message, 'location') !== false || strpos($message, 'address') !== false || strpos($message, 'where') !== false || strpos($message, 'find') !== false) {
            return "📍 We are located at Brgy. Mamatid, City of Cabuyao, Laguna, near the Mamatid Municipal Hall.\n\nYou can easily find us in the heart of the community. See you soon! 🏛️";
        }
        
        // Contact information
        if (strpos($message, 'contact') !== false || strpos($message, 'phone') !== false || strpos($message, 'call') !== false || strpos($message, 'email') !== false) {
            return "📞 Contact Information:\nPhone: 09123456789\n📧 Email: sanvicenteferrer@gmail.com\n🕐 Office Hours: 8:00 AM - 5:00 PM, Monday-Saturday\n\nFeel free to reach out anytime during office hours!";
        }
        
        // Sacrament appointments
        if (strpos($message, 'sacrament') !== false || strpos($message, 'appointment') !== false || strpos($message, 'baptism') !== false || strpos($message, 'wedding') !== false || strpos($message, 'confirmation') !== false) {
            return "⛪ For sacrament appointments (Baptism, Confirmation, First Holy Communion, Matrimony, Confession, Anointing of the Sick):\n\n🌐 How to access online:\n1️⃣ Go to our church website\n2️⃣ Look for Inquiries in the navigation menu\n3️⃣ Click on Inquiries\n4️⃣ Find Appoint Sacraments and click on it\n\n🏛️ In-person: Visit us at the Diocesan Shrine in Mamatid\n\nWe're here to help you with your spiritual journey! 🙏";
        }
        
        // Sacrament scheduling and available times
        if (strpos($message, 'schedule') !== false && (strpos($message, 'sacrament') !== false || strpos($message, 'baptism') !== false || strpos($message, 'wedding') !== false || strpos($message, 'confirmation') !== false)) {
            return "📅 To schedule a sacrament and check available times:\n\n🌐 How to access online:\n1️⃣ Go to our church website\n2️⃣ Look for Inquiries in the navigation menu\n3️⃣ Click on Inquiries\n4️⃣ Select Appoint Sacraments\n5️⃣ Choose your preferred sacrament type\n6️⃣ View all available dates and time slots\n7️⃣ Select your preferred date and time\n8️⃣ Complete the booking process\n\n⏰ Available Sacraments:\n• Baptism\n• Confirmation\n• First Holy Communion\n• Matrimony\n• Confession\n• Anointing of the Sick\n\n📞 For assistance, call us at 09123456789 during office hours!";
        }
        
        // Ministry applications
        if (strpos($message, 'ministry') !== false || strpos($message, 'volunteer') !== false || strpos($message, 'serve') !== false || strpos($message, 'apply') !== false) {
            return "🤝 To apply as a Ministry Member:\n\n🌐 How to access online:\n1️⃣ Go to our church website\n2️⃣ Look for Inquiries in the navigation menu\n3️⃣ Click on Inquiries\n4️⃣ Find Apply as Ministry Member and click on it\n\n🏛️ In-person: Visit the Diocesan Shrine of San Vicente Ferrer in Mamatid\n\nWe welcome you to join our community of faith and service! ✨";
        }
        
        // Certificate requests
        if (strpos($message, 'certificate') !== false || strpos($message, 'document') !== false || strpos($message, 'record') !== false) {
            return "📜 For certificate requests:\n\n🌐 How to access online:\n1️⃣ Go to our church website\n2️⃣ Look for Inquiries in the navigation menu\n3️⃣ Click on Inquiries\n4️⃣ Find Certificate Request and click on it\n\n🏛️ In-person: Visit us at the Diocesan Shrine in Mamatid\n\nWe'll be happy to assist you with your document needs! 📋";
        }
        
        // Prayer requests
        if (strpos($message, 'prayer') !== false || strpos($message, 'pray') !== false || strpos($message, 'intention') !== false) {
            return "🙏 To submit a prayer request:\n\n🌐 How to access online:\n1️⃣ Go to our church website\n2️⃣ Look for Inquiries in the navigation menu\n3️⃣ Click on Inquiries\n4️⃣ Find Prayer Request and click on it\n\n🏛️ In-person: Visit us at the Diocesan Shrine in Mamatid\n\nYour intentions will be remembered in our prayers. God bless! ✨";
        }
        
        // Donation inquiries
        if (strpos($message, 'donate') !== false || strpos($message, 'donation') !== false || strpos($message, 'give') !== false || strpos($message, 'offering') !== false || strpos($message, 'contribute') !== false) {
            return "💰 To make a donation:\n\n🌐 How to access online:\n1️⃣ Go to our church website\n2️⃣ Look for Give in the navigation menu\n3️⃣ Click on Give\n4️⃣ Follow the donation instructions\n\n📱 You can track your donations through our website's Give section\n🏛️ In-person: Visit us at the Diocesan Shrine in Mamatid\n\nThank you for your generous support of our church community! 🙏✨";
        }
        
        // Greetings
        if (preg_match('/^(hello|hi|hey|good morning|good afternoon|good evening|greetings)/', $message)) {
            return "Hello and welcome to the Diocesan Shrine of San Vicente Ferrer! 🙏\n\nHow can I assist you today with information about our church services, events, or community programs? I'm here to help! ✨";
        }
        
        // AI/Bot identification
        if (strpos($message, 'ai') !== false || strpos($message, 'bot') !== false || strpos($message, 'robot') !== false || strpos($message, 'artificial') !== false) {
            return "Yes, I'm an AI assistant created to help you with information about the Diocesan Shrine of San Vicente Ferrer Church! 🤖✨\n\nI'm here to provide information about our services, events, and how you can connect with our faith community. How can I help you today? 🙏";
        }
        
        // Events and activities
        if (strpos($message, 'event') !== false || strpos($message, 'activity') !== false || strpos($message, 'program') !== false || strpos($message, 'announcement') !== false) {
            return "📅 For information about church events and activities:\n\n🌐 How to access online:\n1️⃣ Go to our church website\n2️⃣ Look for Events in the navigation menu\n3️⃣ Click on Events\n4️⃣ Browse all upcoming events and announcements\n\n📞 Call us at 09123456789\n🏛️ Visit our office during business hours\n\nWe have various programs for all ages and interests! 🎉";
        }
        
        // About section items
        if (strpos($message, 'history') !== false || strpos($message, 'about') !== false || strpos($message, 'shrine rector') !== false || strpos($message, 'gallery') !== false || strpos($message, 'news') !== false) {
            return "📖 For church information:\n\n🌐 How to access online:\n1️⃣ Go to our church website\n2️⃣ Look for About in the navigation menu\n3️⃣ Click on About\n4️⃣ Choose from:\n   • History - Learn about our church's story\n   • Shrine Rectors - Meet our church leaders\n   • Gallery - View photos of our church\n   • News - Read latest church updates\n   • Contact Us - Get in touch with us\n\n🏛️ You can also visit us in person at the Diocesan Shrine in Mamatid!";
        }
        
        // Virtual tour and explore
        if (strpos($message, 'virtual') !== false || strpos($message, 'tour') !== false || strpos($message, 'explore') !== false || strpos($message, '360') !== false) {
            return "🏛️ For virtual church tour:\n\n🌐 How to access online:\n1️⃣ Go to our church website\n2️⃣ Look for Explore in the navigation menu\n3️⃣ Click on Explore\n4️⃣ Click on Virtual Tour to start your 360° experience\n\n✨ Experience the beauty of our church from anywhere in the world!\n\n🏛️ You can also visit us in person at the Diocesan Shrine in Mamatid!";
        }
        
        // Catholic teachings and doctrine
        if (strpos($message, 'teaching') !== false || strpos($message, 'doctrine') !== false || strpos($message, 'believe') !== false || strpos($message, 'catholic') !== false) {
            return "✝️ For questions about Catholic teachings and doctrine:\n\n\"All Scripture is God-breathed and is useful for teaching, rebuking, correcting and training in righteousness.\" - 2 Timothy 3:16\n\n🙏 I'd be happy to share Catholic perspectives on various topics. For deeper theological questions, I encourage speaking with our priests during office hours or after Mass.\n\nWhat specific teaching or topic would you like to discuss?";
        }
        
        // Social issues and moral questions
        if (strpos($message, 'what does the church think') !== false || strpos($message, 'church position') !== false || strpos($message, 'catholic view') !== false || strpos($message, 'opinion') !== false) {
            return "🤝 \"Love one another as I have loved you.\" - John 13:34\n\nThe Catholic Church offers guidance on many social and moral issues, always rooted in love, compassion, and human dignity. We believe in approaching all topics with both truth and mercy.\n\n💭 I can share the Church's perspective on various matters while respecting different viewpoints. What topic would you like to discuss?";
        }
        
        // Bible verses and spiritual guidance
        if (strpos($message, 'bible') !== false || strpos($message, 'verse') !== false || strpos($message, 'scripture') !== false || strpos($message, 'spiritual') !== false) {
            return "📖 \"Your word is a lamp for my feet, a light on my path.\" - Psalm 119:105\n\n✨ I'd be happy to share relevant Bible verses and spiritual guidance! The Scriptures offer wisdom and comfort for all aspects of life.\n\nWhat situation or topic would you like spiritual guidance about?";
        }
        
        // Password change requests
        if (strpos($message, 'password') !== false || strpos($message, 'change password') !== false || strpos($message, 'reset password') !== false || strpos($message, 'forgot password') !== false) {
            return "🔐 To change your password:\n\n🌐 How to access online:\n1️⃣ Go to our church website\n2️⃣ Look for the Profile icon in the top navigation\n3️⃣ Click on the Profile icon\n4️⃣ A dropdown menu will appear\n5️⃣ Click on Change Password or Profile Settings\n6️⃣ Follow the instructions to update your password\n\n🔒 For security, make sure to use a strong password with at least 8 characters including letters, numbers, and symbols.\n\n📞 If you need help, call us at 09123456789 during office hours!";
        }
        
        // Account deactivation requests
        if (strpos($message, 'deactivate') !== false || strpos($message, 'delete account') !== false || strpos($message, 'remove account') !== false || strpos($message, 'close account') !== false) {
            return "🚫 To deactivate your account:\n\n🌐 How to access online:\n1️⃣ Go to our church website\n2️⃣ Look for the Profile icon in the top navigation\n3️⃣ Click on the Profile icon\n4️⃣ A dropdown menu will appear\n5️⃣ Click on My Profile\n6️⃣ Look for the Deactivate Account option\n7️⃣ Follow the instructions to deactivate your account\n\n⚠️ Please note: Deactivating your account will remove your access to church services and community features.\n\n📞 If you need help or have concerns, call us at 09123456789 during office hours!";
        }
        
        // Depression and mental health struggles
        if (strpos($message, 'depressed') !== false || strpos($message, 'depression') !== false || strpos($message, 'sad') !== false || strpos($message, 'hopeless') !== false || strpos($message, 'down') !== false) {
            return "I'm so sorry to hear that you're going through such a difficult time. Your feelings are valid, and it takes courage to share what you're experiencing. Please know that you are not alone in this struggle, and there is hope even in the darkest moments.\n\n\"The Lord is close to the brokenhearted and saves those who are crushed in spirit.\" - Psalm 34:18\n\nGod sees your pain and is with you in this moment. Consider reaching out to our church community or a mental health professional for additional support. You are loved and valued. 🙏";
        }
        
        // Anxiety and worry
        if (strpos($message, 'anxious') !== false || strpos($message, 'anxiety') !== false || strpos($message, 'worried') !== false || strpos($message, 'stressed') !== false || strpos($message, 'nervous') !== false) {
            return "I understand how overwhelming anxiety can feel. It's natural to worry about the future and feel uncertain about what lies ahead. Take a deep breath and remember that you don't have to carry this burden alone.\n\n\"Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.\" - Philippians 4:6-7\n\nGod offers us peace that goes beyond our understanding. Trust that He is in control and cares deeply about your well-being. 🙏";
        }
        
        // Grief and loss
        if (strpos($message, 'grief') !== false || strpos($message, 'loss') !== false || strpos($message, 'death') !== false || strpos($message, 'died') !== false || strpos($message, 'mourning') !== false) {
            return "I'm deeply sorry for your loss. Grief is one of the most difficult experiences we face in life, and there are no words that can fully express the pain you're feeling. Please know that it's okay to grieve and that your feelings are completely normal.\n\n\"Blessed are those who mourn, for they will be comforted.\" - Matthew 5:4\n\nJesus Himself experienced loss and understands your pain. He promises to comfort those who mourn. Your loved one's memory will always be a blessing, and you are not alone in this journey of healing. 🙏";
        }
        
        // Relationship problems
        if (strpos($message, 'relationship') !== false || strpos($message, 'marriage') !== false || strpos($message, 'divorce') !== false || strpos($message, 'breakup') !== false || strpos($message, 'conflict') !== false) {
            return "I'm sorry to hear that you're experiencing difficulties in your relationships. Relationships can be challenging, and it's painful when they don't work out as we hoped. Remember that you are worthy of love and respect.\n\n\"Above all, love each other deeply, because love covers over a multitude of sins.\" - 1 Peter 4:8\n\nGod's love for you is unconditional and never-ending. In times of relationship struggles, remember that you are never alone - God is always with you, offering comfort and guidance. 🙏";
        }
        
        // Financial struggles
        if (strpos($message, 'money') !== false || strpos($message, 'financial') !== false || strpos($message, 'broke') !== false || strpos($message, 'debt') !== false || strpos($message, 'unemployed') !== false) {
            return "I understand how stressful financial difficulties can be. It's natural to worry about providing for yourself and your family. Please know that your worth is not determined by your financial situation.\n\n\"And my God will meet all your needs according to the riches of his glory in Christ Jesus.\" - Philippians 4:19\n\nGod sees your needs and cares about your well-being. Trust that He will provide for you in His perfect timing. Consider reaching out to our church community for support during this challenging time. 🙏";
        }
        
        // Health problems
        if (strpos($message, 'sick') !== false || strpos($message, 'illness') !== false || strpos($message, 'disease') !== false || strpos($message, 'pain') !== false || strpos($message, 'hospital') !== false) {
            return "I'm sorry to hear that you're dealing with health challenges. It's difficult to face illness and uncertainty about your health. Please know that you are in my prayers, and God is with you in this journey.\n\n\"He heals the brokenhearted and binds up their wounds.\" - Psalm 147:3\n\nGod is the ultimate healer, and He cares deeply about your physical and emotional well-being. Trust in His love and know that you are not facing this alone. Our church community is here to support you. 🙏";
        }
        
        // Loneliness and isolation
        if (strpos($message, 'lonely') !== false || strpos($message, 'alone') !== false || strpos($message, 'isolated') !== false || strpos($message, 'no friends') !== false) {
            return "I'm sorry that you're feeling lonely. It's a painful experience to feel disconnected from others, but please know that you are never truly alone. God is always with you, and there are people who care about you.\n\n\"For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord.\" - Romans 8:38-39\n\nYou are deeply loved by God, and our church community welcomes you with open arms. Consider reaching out to us - we would love to connect with you. 🙏";
        }
        
        // Suicidal thoughts
        if (strpos($message, 'suicide') !== false || strpos($message, 'kill myself') !== false || strpos($message, 'end it all') !== false || strpos($message, 'not worth living') !== false) {
            return "I'm deeply concerned about you and want you to know that your life has incredible value and meaning. What you're feeling right now is temporary, even though it may not seem that way. Please reach out for help immediately.\n\n\"For I know the plans I have for you,\" declares the Lord, \"plans to prosper you and not to harm you, plans to give you hope and a future.\" - Jeremiah 29:11\n\nGod has a purpose for your life, and there are people who care about you deeply. Please call a crisis helpline or reach out to our church immediately. You are not alone, and there is hope. 🙏\n\n📞 Crisis Hotline: 0917-899-8727 (NCMH Crisis Hotline)";
        }
        
        // Default response
        return "Thank you for reaching out to the Diocesan Shrine of San Vicente Ferrer! 🙏\n\nFor immediate assistance with any church-related inquiries:\n📞 Call: 09123456789\n🕐 Office Hours: 8:00 AM - 5:00 PM, Monday-Saturday\n🏛️ Visit us in Brgy. Mamatid, Cabuyao, Laguna\n\nMay God bless you! ✨";
    }
    
    /**
     * Check if the message contains inappropriate content (cursing and rudeness)
     */
    private function containsInappropriateContent($message)
    {
        $message = strtolower($message);
        
        // Focus on cursing and profanity only
        $profanityWords = [
            // English profanity and cursing
            'fuck', 'fucking', 'shit', 'bitch', 'bastard', 'asshole', 'damn it', 'goddamn',
            // Filipino profanity and cursing
            'putang', 'gago', 'tangina', 'kingina', 'puta', 'leche', 'peste', 'hudas',
            'tanga', 'bobo', 'ulol', 'tarantado', 'bwisit', 'hayop ka',
            // Rude expressions
            'shut up', 'fuck you', 'go to hell', 'screw you', 'piss off',
            'what the hell is wrong', 'what is wrong with you', 'you are stupid',
            'tang ina mo', 'gago ka', 'bobo ka', 'tanga ka', 'you idiot'
        ];
        
        foreach ($profanityWords as $word) {
            // Use word boundaries for single words to avoid false positives
            if (strpos($word, ' ') !== false) {
                // For phrases, use direct string search
                if (strpos($message, $word) !== false) {
                    return true;
                }
            } else {
                // For single words, use word boundaries
                if (preg_match('/\b' . preg_quote($word, '/') . '\b/', $message)) {
                    return true;
                }
            }
        }
        
        // Check for excessive caps (might indicate shouting/anger) - but only for longer messages
        if (strlen($message) > 20 && ctype_upper(str_replace([' ', '!', '?', '.'], '', $message))) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if the message is asking about Catholic teachings or social issues
     */
    private function isTeachingOrSocialIssueQuestion($message)
    {
        $message = strtolower($message);
        
        // Keywords that indicate questions about teachings or social issues
        $teachingKeywords = [
            'what does the church think', 'church position', 'catholic view', 'catholic teaching',
            'what does god think', 'what does jesus think', 'bible says about', 'scripture says',
            'is it a sin', 'is it wrong', 'church believes', 'catholic believes',
            'church opinion on', 'church view on', 'church stance on', 'church position on',
            'divorce', 'abortion', 'contraception', 'homosexuality', 'lgbt',
            'death penalty', 'euthanasia', 'social justice',
            'salvation', 'heaven', 'hell', 'purgatory', 'saints',
            'celibacy', 'trinity', 'holy spirit', 'resurrection', 'incarnation'
        ];
        
        foreach ($teachingKeywords as $keyword) {
            // Use word boundaries for single words to avoid partial matches
            if (count(explode(' ', $keyword)) == 1) {
                if (preg_match('/\b' . preg_quote($keyword, '/') . '\b/', $message)) {
                    return true;
                }
            } else {
                // For phrases, use regular string search
                if (strpos($message, $keyword) !== false) {
                    return true;
                }
            }
        }
        
        // Check for question patterns (more specific)
        $questionPatterns = [
            'what is the catholic',
            'what do catholics believe',
            'why does the church',
            'how does the church view',
            'what does the church say about',
            'what does the church teach',
            'what does god think about',
            'what does jesus say about',
            'what would jesus do'
        ];
        
        foreach ($questionPatterns as $pattern) {
            if (strpos($message, $pattern) !== false) {
                return true;
            }
        }
        
        return false;
    }
}