// COPIA Y PEGA AQUÍ TU OBJETO EXACTO DE LA WEB:
const firebaseConfig = {
  apiKey: "AIzaSyC97fkEWWkIjBLDpwvVxN2euhk8N7FNA40",
  authDomain: "srm-daniela.firebaseapp.com",
  databaseURL: "https://srm-daniela-default-rtdb.firebaseio.com",
  projectId: "srm-daniela",
  storageBucket: "srm-daniela.firebasestorage.app",
  messagingSenderId: "976335690387",
  appId: "1:976335690387:web:d01c0bf7815b379162cb66"
};

// Inicializar Firebase de forma global
firebase.initializeApp(firebaseConfig);

// Inicializar la base de datos Firestore en el objeto global db
const db = firebase.firestore();