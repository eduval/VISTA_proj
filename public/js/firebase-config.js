// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCFbMhrpR1hVEZ8XMleE8LqMPsdFw2Pk10",
    authDomain: "vista-testing-env-cctb.firebaseapp.com",
    databaseURL: "https://vista-testing-env-cctb-default-rtdb.firebaseio.com",
    projectId: "vista-testing-env-cctb",
    storageBucket: "vista-testing-env-cctb.firebasestorage.app",
    messagingSenderId: "534260644306",
    appId: "1:534260644306:web:aeddddee0a0d8e1ace300b",
    measurementId: "G-PJSPLNVT3M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
