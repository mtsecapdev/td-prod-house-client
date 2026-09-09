import { useState } from 'react';
import { Chat } from '@/components/ui/chat';
import documentsServices from '../services/documentsServices';

export default function Chatbox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  function handleInputChange(e) {
    setInput(e.target.value);
  }

  // handleSubmit key explanation
  /**
   * "messages" state refers to the things that will be used to update the UI
   * I will also use it to control the "history"
   * Save the user's query as {id, role, content} - this is from Vercel's defined Message interface shape.
   * setMessages to include this new user query so we update the UI.
   * Reset input to blank
   * setIsGenerating(true)
   *
   * Give documentServices.sendQuery(query, docIdsToReference, messages.slice(0, -1)) !! slice till -1 cos we dont need to include the newest user query as a history to the llm
   * query is just the input value
   * docIdsToReference?
   *
   * With the llm's response, setMessages with ...messages, and the added llm response again formatted to {id, role, content}
   */
  async function handleSubmit(e) {
    e.preventDefault();
    const newUserMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    };
    const messagesWithUserInput = [...messages, newUserMessage];
    setMessages(messagesWithUserInput);
    setInput('');

    try {
      const modelResponse = await documentsServices.sendQuery(
        newUserMessage.content,
        docIdsToReference,
        messagesWithUserInput.slice(0, -1),
      );
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: modelResponse,
        },
      ]);
    } catch (error) {
      console.log('Chatbox error: ' + error);
    }
  }

  return (
    <Chat
      messages={messages}
      input={input}
      handleInputChange={handleInputChange}
      handleSubmit={handleSubmit}
      stop={() => {}}
    />
  );
}
