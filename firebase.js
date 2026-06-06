import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { 
  getFirestore 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "여기에 복붙",
  authDomain: "여기에 복붙",
  projectId: "여기에 복붙",
  storageBucket: "여기에 복붙",
  messagingSenderId: "여기에 복붙",
  appId: "여기에 복붙"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);