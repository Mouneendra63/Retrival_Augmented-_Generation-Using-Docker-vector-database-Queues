"use client";
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FileText, Send, Upload, X, Info, Book, MessageSquare, Loader2, Bookmark, Download, Copy, Clock, User, Bot } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  sources?: string[];
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploaded: Date;
}

const RAGChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '👋 Hello! Upload your PDFs and I can answer questions based on their content.',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  const [botTypingText, setBotTypingText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'documents'>('chat');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [savedChats, setSavedChats] = useState<{id: string, title: string, preview: string}[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
  
    setIsLoading(true);
  
    const newFiles: UploadedFile[] = [];
  
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type === 'application/pdf') {
          const formData = new FormData();
          formData.append('file', file); // ✅ Correct: backend expects single "file"
  
          // 🔥 Real API upload call here
          const uploadRes = await axios.post('/api/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
  
          console.log('Uploaded:', uploadRes.data);
  
          newFiles.push({
            id: `file-${Date.now()}-${i}`,
            name: file.name,
            size: file.size,
            uploaded: new Date(),
          });
        }
      }
  
      if (newFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...newFiles]);
        setIsChatEnabled(true);
  
        const fileNames = newFiles.map(file => file.name).join(', ');
  
        setMessages(prev => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            text: `✅ Successfully uploaded: ${fileNames}`,
            isUser: false,
            timestamp: new Date(),
          },
          {
            id: `msg-${Date.now() + 1}`,
            text: `💬 I've analyzed your documents. You can start asking questions!`,
            isUser: false,
            timestamp: new Date(),
          },
        ]);
  
        setActiveTab('chat');
  
        // Focus input box after short delay
        setTimeout(() => {
          if (messageInputRef.current) {
            messageInputRef.current.focus();
          }
        }, 300);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          text: `❌ Error: Failed to upload your PDFs. Please try again.`,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
  
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // clear file input after upload
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
  
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };
  
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setBotTypingText('');
  
    try {
      // 🔥 Real API call to /api/chat
      const res = await axios.post('/api/chat', { message: inputMessage });
  
      const botFullResponse = res.data.message;
      const relatedDocs = res.data.docs || [];
  
      // Optional: Extract source info (page + filename) from docs
      const sources = relatedDocs.map((doc: any) => {
        const meta = doc.metadata || {};
        const filename = meta.fileName || meta.source || 'unknown.pdf';
        const page = meta.page || meta.pageNumber || '?';
        return `Page ${page} in ${filename}`;
      });
  
      let currentText = '';
      for (let i = 0; i < botFullResponse.length; i++) {
        currentText += botFullResponse[i];
        setBotTypingText(currentText);
        await new Promise(resolve => setTimeout(resolve, Math.random() * 15 + 10));
      }
  
      const botMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        text: botFullResponse,
        isUser: false,
        timestamp: new Date(),
        sources: sources,
      };
  
      setMessages(prev => [...prev, botMessage]);
      setBotTypingText('');
    } catch (err) {
      console.error('❌ Message failed:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          text: '❌ Error: Failed to get a response from the server.',
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    }
  
    setIsLoading(false);
  };
  // Mock response generation based on input
  const generateMockResponse = (input: string): string => {
    const responses = [
      `Based on the documents you've uploaded, I found several relevant insights about "${input}". The main points include detailed explanations on pages 12-14, with supporting evidence from research studies mentioned on page 7. Would you like me to elaborate on any specific aspect?`,
      `Looking through your PDFs, there are multiple references to "${input}". According to the content in document1.pdf, this concept relates to several key areas discussed in section 3.2. Document2.pdf provides additional context with practical examples.`,
      `I've analyzed your question about "${input}" against your uploaded documents. The most relevant information appears in chapters 4 and 7, where the authors present a comprehensive framework. There are also some interesting case studies that might help you understand the practical applications.`,
      `Your question about "${input}" is addressed extensively in your documents. The primary source discusses this on pages 23-25, presenting both theoretical foundations and practical implications. There's also a related discussion in the second document that offers alternative perspectives.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    if (uploadedFiles.length <= 1) {
      setIsChatEnabled(false);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, botTypingText]);

  // Initialize mock saved chats
  useEffect(() => {
    setSavedChats([
      {id: 'saved-1', title: 'Research Discussion', preview: 'Questions about machine learning algorithms'},
      {id: 'saved-2', title: 'Legal Document Analysis', preview: 'Contract review and summary'},
    ]);
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const clearChat = () => {
    setMessages([{
      id: '1',
      text: '👋 Chat cleared! What would you like to know about your documents?',
      isUser: false,
      timestamp: new Date(),
    }]);
  };

  const saveCurrentChat = () => {
    // Mock saving functionality
    alert('Chat saved successfully!');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const copyMessageToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100'}`}>
      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl shadow-xl max-w-md`}>
            <h2 className="text-2xl font-bold mb-4">Welcome to PDF Chat</h2>
            <p className="mb-4">Upload your PDF documents and chat with an AI assistant that can answer questions based on their content.</p>
            <div className="flex justify-between">
              <button
                onClick={() => setShowWelcomeModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </button>
              <button
                onClick={() => {
                  setShowWelcomeModal(false);
                  setShowChatInfo(true);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`w-1/4 flex flex-col border-r ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Book className="text-blue-500" /> 
            PDF Knowledge Assistant
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Your AI-powered document chat companion
          </p>
        </div>

        {/* Sidebar Navigation */}
        <div className={`flex border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 flex justify-center items-center gap-2 ${
              activeTab === 'chat' 
              ? isDarkMode 
                ? 'border-b-2 border-blue-400 text-blue-400' 
                : 'border-b-2 border-blue-500 text-blue-600' 
              : isDarkMode 
                ? 'text-gray-400' 
                : 'text-gray-500'
            }`}
          >
            <MessageSquare size={18} /> Chat
          </button>
          <button 
            onClick={() => setActiveTab('documents')}
            className={`flex-1 py-3 flex justify-center items-center gap-2 ${
              activeTab === 'documents' 
              ? isDarkMode 
                ? 'border-b-2 border-blue-400 text-blue-400' 
                : 'border-b-2 border-blue-500 text-blue-600' 
              : isDarkMode 
                ? 'text-gray-400' 
                : 'text-gray-500'
            }`}
          >
            <FileText size={18} /> Documents
          </button>
        </div>

        {/* Sidebar Content - Changes based on active tab */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chat' ? (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-medium">Saved Conversations</h2>
                <button 
                  onClick={saveCurrentChat}
                  className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                >
                  <Bookmark size={16} className="text-blue-500" />
                </button>
              </div>
              
              {savedChats.length > 0 ? (
                <div className="space-y-2">
                  {savedChats.map(chat => (
                    <div 
                      key={chat.id} 
                      className={`p-3 rounded-lg cursor-pointer flex items-start gap-3 ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <Clock size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                      <div>
                        <p className="font-medium">{chat.title}</p>
                        <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {chat.preview}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No saved chats yet
                </p>
              )}
              
              <div className="pt-4 border-t mt-6 space-y-2">
                <button 
                  onClick={clearChat}
                  className={`w-full p-2 rounded-lg text-sm ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Clear Current Chat
                </button>
                <button 
                  onClick={toggleDarkMode}
                  className={`w-full p-2 rounded-lg text-sm ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
              
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-blue-700'}`}>
                  Quick Tips
                </h3>
                <ul className={`text-sm mt-2 space-y-1 ${isDarkMode ? 'text-gray-300' : 'text-blue-600'}`}>
                  <li>• Ask specific questions about document content</li>
                  <li>• Request summaries of specific sections</li>
                  <li>• Compare information across documents</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-medium">Your Documents</h2>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf"
                  multiple
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  disabled={isLoading}
                >
                  <Upload size={16} className="text-blue-500" />
                </button>
              </div>

              {isLoading && (
                <div className={`flex items-center justify-center p-4 rounded-lg ${
                  isDarkMode ? 'bg-gray-700' : 'bg-blue-50'
                }`}>
                  <Loader2 size={24} className="animate-spin text-blue-500 mr-2" />
                  <span>Processing documents...</span>
                </div>
              )}
              
              {!isLoading && uploadedFiles.length === 0 ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer ${
                    isDarkMode 
                      ? 'border-gray-600 hover:border-gray-500' 
                      : 'border-gray-300 hover:border-blue-400'
                  }`}
                >
                  <Upload size={32} className={`mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <p className="font-medium">Click to upload PDFs</p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    or drag and drop files here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {uploadedFiles.map(file => (
                    <div
                      key={file.id}
                      className={`rounded-lg p-3 flex items-start justify-between ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <FileText size={20} className="mt-1 text-blue-500" />
                        <div>
                          <p className="font-medium line-clamp-1">{file.name}</p>
                          <div className="flex gap-2 text-xs mt-1">
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                              {formatFileSize(file.size)}
                            </span>
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                              {formatDate(file.uploaded)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex">
                        <button
                          className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                        >
                          <Download size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                        </button>
                        <button
                          onClick={() => handleRemoveFile(file.id)}
                          className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                        >
                          <X size={16} className={isDarkMode ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className={`mt-4 w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 ${
                  isLoading
                    ? isDarkMode 
                      ? 'bg-gray-700 text-gray-400' 
                      : 'bg-gray-200 text-gray-500'
                    : isDarkMode
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                } transition-colors`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload More PDFs
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`w-3/4 flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Chat Header */}
        <div className={`p-4 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">AI Document Assistant</h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {isChatEnabled 
                  ? `${uploadedFiles.length} document${uploadedFiles.length !== 1 ? 's' : ''} loaded` 
                  : "Upload documents to start chatting"}
              </p>
            </div>
            <button 
              onClick={() => setShowChatInfo(!showChatInfo)}
              className={`p-2 rounded-full ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <Info size={18} className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </button>
          </div>
          
          {/* Info Panel - Conditionally rendered */}
          {showChatInfo && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-gray-700'
            }`}>
              <h3 className="font-medium mb-2">How RAG Chat Works:</h3>
              <p>1. Upload your PDF documents</p>
              <p>2. The system analyzes and indexes the content</p>
              <p>3. Ask questions about any information in your documents</p>
              <p>4. Get accurate answers with citations to the source material</p>
              <button 
                onClick={() => setShowChatInfo(false)}
                className={`mt-2 text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
              >
                Hide Info
              </button>
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div
          ref={chatContainerRef}
          className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDarkMode ? '' : ''}`}
        >
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-start gap-2 max-w-3/4 group">
                {/* Avatar */}
                <div className={`rounded-full p-2 flex-shrink-0 ${
                  message.isUser 
                    ? isDarkMode ? 'bg-blue-600' : 'bg-blue-100' 
                    : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  {message.isUser ? (
                    <User size={16} className={isDarkMode ? 'text-white' : 'text-blue-600'} />
                  ) : (
                    <Bot size={16} className={isDarkMode ? 'text-white' : 'text-gray-700'} />
                  )}
                </div>
                
                {/* Message Content */}
                <div
                  className={`p-3 rounded-lg ${
                    message.isUser
                      ? isDarkMode 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-600 text-white'
                      : isDarkMode 
                        ? 'bg-gray-800 text-gray-100 border border-gray-700' 
                        : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  
                  {/* Source Citations */}
                  {message.sources && message.sources.length > 0 && (
                    <div className={`mt-2 pt-2 text-xs ${
                      isDarkMode ? 'border-t border-gray-700 text-gray-400' : 'border-t border-gray-200 text-gray-500'
                    }`}>
                      <p className="font-medium">Sources:</p>
                      <ul className="mt-1">
                        {message.sources.map((source, index) => (
                          <li key={index}>{source}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-2">
                    <p className={`text-xs ${
                      message.isUser 
                        ? 'text-blue-200' 
                        : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                    
                    {/* Copy button - only visible on hover */}
                    <button
                      onClick={() => copyMessageToClipboard(message.text)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                        message.isUser
                          ? 'hover:bg-blue-700 text-blue-200'
                          : isDarkMode
                            ? 'hover:bg-gray-700 text-gray-400'
                            : 'hover:bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {botTypingText && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2 max-w-3/4">
                <div className={`rounded-full p-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <Bot size={16} className={isDarkMode ? 'text-white' : 'text-gray-700'} />
                </div>
                <div className={`p-3 rounded-lg ${
                  isDarkMode 
                    ? 'bg-gray-800 text-gray-100 border border-gray-700' 
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}>
                  <p className="whitespace-pre-wrap">
                    {botTypingText}<span className="inline-block w-1 h-4 bg-blue-500 animate-pulse ml-0.5"></span>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {messages.length === 1 && !isLoading && !botTypingText && (
            <div className={`h-full flex flex-col items-center justify-center ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <div className={`rounded-full p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} mb-4`}>
                <MessageSquare size={32} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
              <p className="text-center max-w-md">
                {isChatEnabled 
                  ? "Your documents are ready. Ask me anything about them!"
                  : "Upload PDF documents first to enable chat functionality"}
              </p>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className={`p-4 border-t ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="relative">
            <input
              ref={messageInputRef}
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                } else if (e.key === 'Enter' && e.shiftKey) {
                  // Allow multiline by not preventing default
                }
              }}
              disabled={!isChatEnabled || isLoading}
              placeholder={isChatEnabled ? "Ask about your documents..." : "Upload PDFs to start chatting"}
              className={`w-full p-4 pr-12 rounded-lg focus:outline-none focus:ring-2 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500' 
                  : 'bg-white border border-gray-300 text-gray-800 placeholder-gray-500 focus:ring-blue-500'
              }`}
            />
            <button
              onClick={handleSendMessage}
              disabled={!isChatEnabled || isLoading}
              className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full ${
                isLoading 
                  ? isDarkMode 
                    ? 'bg-gray-700 text-gray-400' 
                    : 'bg-gray-200 text-gray-500' 
                  : isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
              } transition-colors`}
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} className={isDarkMode ? 'text-white' : 'text-gray-100'} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default RAGChatInterface;