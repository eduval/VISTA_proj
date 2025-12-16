// testCoreTasks.js
import { db } from "./firebase-config.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const serviceId = "1765132378711";
const userId = "2rO9rImzR4S29lcavSxvPPimSK03";

get(ref(db, `coreTasks/${serviceId}/${userId}`))
    .then(snap => console.log(snap.val()))
    .catch(err => console.error(err));


