const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const fileInput = document.getElementById("file-input");

let selectedFile = null;

// File preview
fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    selectedFile = fileInput.files[0];
    let previewDiv = document.createElement("div");
    previewDiv.classList.add("msg", "user");

    if (selectedFile.type.startsWith("image/")) {
      let img = document.createElement("img");
      img.src = URL.createObjectURL(selectedFile);
      img.classList.add("preview");
      previewDiv.appendChild(img);
    } else {
      previewDiv.innerHTML = `📁 ${selectedFile.name}`;
    }

    chatBox.appendChild(previewDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});

// Add message (returns msg element if needed)
function addMessage(sender, text, isTyping = false) {
  if (!text) return null;
  const msg = document.createElement("div");
  msg.classList.add("msg", sender);
  msg.innerHTML = text;
  if (isTyping) msg.classList.add("typing");
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

// Send message
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text && !selectedFile) return;

  addMessage("user", text || (selectedFile ? selectedFile.name : ""));

  const formData = new FormData();
  formData.append("message", text);
  if (selectedFile) formData.append("file", selectedFile);

  userInput.value = "";
  fileInput.value = "";
  selectedFile = null;

  // Show typing indicator
  const typingMsg = addMessage("ai", "⏳ AI is typing", true);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    // Replace typing text with final reply
    typingMsg.classList.remove("typing");
    typingMsg.innerHTML = data.reply;

  } catch (err) {
    typingMsg.classList.remove("typing");
    typingMsg.innerHTML = "❌ Error connecting to server.";
  }
}

// Button click
sendBtn.addEventListener("click", sendMessage);

// Enter key
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
