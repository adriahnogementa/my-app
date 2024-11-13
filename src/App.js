import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ".//styles/main.css";
import "./styles/normalize.css";
import "./styles/loader.css";
import ToggleSwitch from "./components/ToggleSwitch";


const App = () => {
  const [input, setInput] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('mode');
    return savedMode ? savedMode : 'dark';
  });
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState(getChatHistory());
  const [selectedChatNumber, setSelectedChatNumber] = useState(getNextChatId());
  const [highestChatNumber] = useState(getHighestChatNumber());
  const [abortController, setAbortController] = useState(new AbortController());
  const [toggleValue, setToggleValue] = useState(false);
  const chatLogContainerRef = useRef(null);

  useEffect(() => {
    if (highestChatNumber !== -1) {
      const chat = getChatById(getHighestChatNumber());
      if (chat && chat.messages) {
        loadChat(chat);
      }
    }

  }, []);

  useEffect(() => {
    if (chatLogContainerRef.current) {
      chatLogContainerRef.current.scrollTop = chatLogContainerRef.current.scrollHeight;
    }
  }, [chatLog]);

  useEffect(() => {
    localStorage.setItem('mode', mode);
  }, [mode]);

  const handleToggleChange = () => {
    setToggleValue(!toggleValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setChatLog([...chatLog, { user: "me", message: input }]);
    setInput("");
    const controller = new AbortController();
    setAbortController(controller);

    console.log(input);

    const encodedQuestion = encodeURIComponent(input);
    console.log(encodedQuestion);

    const translate = toggleValue;
    console.log(translate);

    const translateParam = translate.toString();

    const url = `https://hsw.westeurope.cloudapp.azure.com:8000/question6?data=${encodedQuestion}&translate=${translateParam}`;

    console.log(url);

    try {

      const response = await axios.get(url, {

        withCredentials: true,

        crossDomain: true,

      });


      const answer = response.data.answer;

      console.log(answer);

      if (answer) {
        setChatLog(prev => [...prev, { user: "mistral", message: answer }]);
        saveToLocalStorage(input, answer);
      }

      setLoading(false);
    } catch (error) {
      setChatLog(prev => [...prev, { user: "mistral", message: "Entschuldigung, ich konnte deine Anfrage nicht verarbeiten." }]);
      console.error('Error:', error);
      saveToLocalStorage(input, "Entschuldigung, ich konnte deine Anfrage nicht verarbeiten.");
      setLoading(false);
    }
  };


  const clearChat = () => {
    setChatLog([]);
  }

  const changeMode = () => {
    setMode(mode === 'dark' ? 'white' : 'dark');
  }

  const handleNewChatIconClick = () => {
    if (getChatHistory().length == 0) {
      return;
    }
    if (getChatById(getHighestChatNumber()).messages.length === 0) {
      return;
    }

    let chatHistory = getChatHistory();
    let nextId = getNextChatId();

    chatHistory.push({
      chatId: nextId,
      chatName: "Chat #" + nextId,
      messages: []
    });

    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    setChatHistory(chatHistory);
    clearChat();
    loadChat(getChatById(nextId));
  }

  const cancelRequest = async () => {
    abortController.abort();
    setLoading(false);
  };


  function getChatHistory() {
    return JSON.parse(localStorage.getItem("chatHistory")) || [];
  }

  function getNextChatId() {
    let chatHistory = getChatHistory();
    if (chatHistory.length === 0) {
      return 0;
    }
    let length = chatHistory.length;

    return chatHistory[length - 1].chatId + 1;
  }

  function getChatById(chatId) {
    let chatHistory = getChatHistory();
    return chatHistory.find(chat => chat.chatId === chatId);
  }

  function saveToLocalStorage(request, response) {
    let chatHistory = getChatHistory();
    if (chatHistory.length === 0) {
      chatHistory.push({
        chatId: 0,
        chatName: "Chat #0",
        messages: []
      });
      setSelectedChatNumber(0);
      const chatToStoreData = chatHistory.find(chat => chat.chatId === 0);

      chatToStoreData.messages.push({
        messageNumber: 1,
        request: request,
        response: response
      });

    } else {
      const chatToStoreData = chatHistory.find(chat => chat.chatId === selectedChatNumber);

      let messageCounter = chatToStoreData.messages.length + 1;

      chatToStoreData.messages.push({
        messageNumber: messageCounter,
        request: request,
        response: response
      });

    }
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    setChatHistory([...chatHistory]);
  }


  function loadChat(chat) {
    clearChat();
    setSelectedChatNumber(chat.chatId);

    for (let i = 0; i < chat.messages.length; i++) {
      const message = chat.messages[i];
      setChatLog(prev => [...prev, { user: "me", message: message.request }]);
      setChatLog(prev => [...prev, { user: "mistral", message: message.response }]);
    }

  }

  function loadChatById(id) {
    const chat = getChatById(id);
    clearChat();
    setSelectedChatNumber(chat.chatId);

    for (let i = 0; i < chat.messages.length; i++) {
      const message = chat.messages[i];
      setChatLog(prev => [...prev, { user: "me", message: message.request }]);
      setChatLog(prev => [...prev, { user: "mistral", message: message.response }]);
    }
  }

  function editChat(selectedChat) {
    const newChatName = prompt("Neuer Chat Name", selectedChat.chatName);
    if (newChatName) {
      let chatHistory = getChatHistory();
      const chatToEdit = chatHistory.find(chat => chat.chatId === selectedChat.chatId);
      chatToEdit.chatName = newChatName;
      localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
      setChatHistory(chatHistory);
    }
  }

  function deleteChat(event, selectedChat) {
    event.stopPropagation();
    if (getChatHistory().length === 1) {
      if (window.confirm("Möchtest du diesen Chatinhalt wirklich löschen?")) {
        let chatHistory = getChatHistory();
        chatHistory.find(chat => chat.chatId === selectedChat.chatId).messages = [];
        localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
        setChatHistory(chatHistory);
        clearChat();
        loadChat(getChatById(selectedChat.chatId));
      }
    } else {
      if (window.confirm("Möchtest du diesen Chat wirklich löschen?")) {
        let chats = getChatHistory();
        chats = chats.filter(chat => chat.chatId !== selectedChat.chatId);
        localStorage.setItem("chatHistory", JSON.stringify(chats));
        setChatHistory(chats);
        if (selectedChat.chatId === selectedChatNumber) {
          console.log("highestChatNumber: " + getHighestChatNumber());
          loadChatById(getHighestChatNumber());
        }
      }
    }
  }



  function getHighestChatNumber() {
    return getNextChatId() - 1;
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.shiftKey) {
      setInput((prevInput) => prevInput + '\n');
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };



  return (
    <div className='app'>
      <aside className='side-menu'>
        <div className='side-menu-newChat' onClick={handleNewChatIconClick}>
          <span className='plus'>+</span> Neuer chat
        </div>
        <div className='chat-history'>
          <ul>
            {chatHistory.slice(0).reverse().map((chat, index) => (
              <li key={index}>
                <div className={`side-menu-newChat ${selectedChatNumber === chat.chatId ? 'selected-chat' : ''}`} onClick={() => { loadChat(chat) }} id={chat.chatId}>
                  <div style={{ width: '180px' }}>
                    {chat.chatName}
                  </div>
                  <div style={{ display: 'flex' }}>
                    <img src="..\assets\edit.svg" alt="editLogo" style={{ width: '20px', height: '20px' }} onClick={() => editChat(chat)} />
                    <img src="..\assets\delete.svg" alt="deleteLogo" style={{ width: '20px', height: '20px' }} onClick={(e) => deleteChat(e, chat)} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className='side-menu-bottom'>
          <hr />
          <div className='side-menu-newChat' onClick={changeMode}>
            <span className='plus'>
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            </span>
            {mode === 'dark' ? "Light Mode" : "Dark Mode"}
          </div>
        </div>
      </aside>
      <section ref={chatLogContainerRef} className={`chatbox ${mode === 'dark' ? 'bg-dark' : 'bg-white'}`} >
        <div className='chat-log'>
          {chatLog.length > 0 ?
            chatLog.map((el, i) => {
              return <ChatMessage key={i} message={el} mode={mode} />
            })
            :
            <h1 className='start-converstion' >
              <img src="..\assets\AirITSystems-Logo.png" alt="Logo" className="logo" />
              <br></br>
              <br></br>
              KI Chat Bot<br />
              <span className='sub-text'>Stelle eine Frage und ich werde dir schon helfen!<br />
                <br />
                <strong>Paar Tipps für die Benutzung:</strong>
                <br />
                <br />
                Nachdem du eine Frage gestellt hast, klicke auf das Senden-Symbol oder drücke die <br />Eingabetaste.
                Falls du die Anfrage abbrechen möchtest, klicke auf das Animations-Symbol.
                <br />
                <br />
                Zudem kannst du mit dem Toogle Switch die Antworten der KI übersetzen lassen.
                Die Qualität <br /> der Übersetzung kann variieren.
                Unsere Empfehlung ist, die Antworten in der Originalsprache<br /> zu lesen.
              </span>
            </h1>
          }
        </div>
        <div className={`chat-input blur`} >


          <div className={`chat-input-div`} >
            <form onSubmit={handleSubmit}>
              <textarea
                placeholder='Frage eingeben...'
                className={`chat-input-box ${mode === 'dark' ? 'bg-dark' : 'bg-white'}`}
                value={input}
                disabled={loading}
                onChange={(e) => { setInput(e.target.value) }}
                onKeyDown={handleKeyDown}
              />
            </form>
            <span className='chat-input-icon'>
              {loading ? (
                <div className="loader" onClick={cancelRequest}></div>
              ) : (
                <svg onClick={handleSubmit} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1" height="1.13em" width="1.13em" xmlns="http://www.w3.org/2000/svg" style={{ cursor: 'pointer' }}>
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              )}
            </span>
            <div className={'toggleSwitch'}>
              <React.Fragment>
                <ToggleSwitch label=" " value={toggleValue} onChange={handleToggleChange} />
              </React.Fragment>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
export default App

const ChatMessage = ({ message, mode }) => {

  function linkify(text) {
    var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    return text.replace(urlRegex, function (url) {
      return '<a href="' + url + '">' + url + '</a>';
    });
  };

  const formatTextToHTML = (text) => {
    text = linkify(text);
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/```\s*(.*?)\s*```/s, '<code class="prettyprint">$1</code>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/\n\n/g, '</p><p>');
    text = text.replace(/\n/g, '<br>');
    text = text.replace(/(\d+\.\s)/g, '</li><li>');
    text = '<p>' + text + '</p>';
    text = text.replace(/<p>(\d+\.\s)(.*?)<\/p>/g, '<ul><li>$2</li></ul>');

    return text;
  }

  return (
    <div className={`chat-message ${mode === 'dark' ? 'bg-dark' : 'bg-white'}`} >
      <div className='chat-message-center'>
        <img src={message.user === 'me' ? "..\\assets\\user-message.png" : "..\\assets\\ai-message.png"} className="avatar" />
        {
          message.user === 'chatgpt' &&
          <svg width="30" height="30" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth="1.5" class="h-6 w-6">
          </svg>
        }

        <div className='message' >
          <p dangerouslySetInnerHTML={{ __html: formatTextToHTML(message.message) }}></p>
        </div>
      </div>
    </div>
  )
}
