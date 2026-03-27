
import React from 'react';
import { ChatMessage, MessageSender } from '../types';

interface ChatMessageProps {
  message: ChatMessage;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === MessageSender.USER;
  const messageClasses = isUser
    ? 'bg-blue-500 text-white self-end rounded-bl-xl'
    : 'bg-gray-300 text-gray-800 self-start rounded-br-xl';

  return (
    <div className={`max-w-[70%] p-3 my-1 rounded-xl shadow-md ${messageClasses}`}>
      <p className="text-sm">{message.text}</p>
      <span className="text-xs opacity-75 mt-1 block">
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
};

export default ChatMessage;