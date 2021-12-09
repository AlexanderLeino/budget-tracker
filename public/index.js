
let transactions = [];
let myChart;
//Inorder for us to be able to insert multiple transactions into the db after being in offline we need to be able to store each value. In order for us to do that we would need to store them into an array. 
let allOfflineTransactions = []
//We will be using IndexDb to store values to the users offline browers so when they are reconnected to the internet then those transcations will be added to the ledger. 
//For more informaton about indexDB please refer to the IndexDB MDN Documentation here https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB 

fetch("/api/transaction")
  .then(response => {
    return response.json();
  })
  .then(data => {
    // save db data on global variable
    transactions = data;

    populateTotal();
    populateTable();
    populateChart();
  });

function populateTotal() {
  // reduce transaction amounts to a single total value
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

function populateTable() {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart() {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
      data: {
        labels,
        datasets: [{
            label: "Total Over Time",
            fill: true,
            backgroundColor: "#6666ff",
            data
        }]
    }
  });
}

//This function is capturing the values inputed into the browser

function sendTransaction(isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  //This is ensuring each transaction has a name and a value tied too it. 
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  // create record
  //If the transaction has a name and valeu then those values are stored into an object name transaction. 
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }

  // add to beginning of current array of data
  transactions.unshift(transaction);

  // re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();
  
  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
  .then(response => {    
    return response.json();
  })
  .then(data => {
    if (data.errors) {
      errorEl.textContent = "Missing Information";
    }
    else {
      // clear form
      nameEl.value = "";
      amountEl.value = "";
    }
  })
  .catch(err => {
    // fetch failed, so save in indexed db
    saveRecord(transaction);

    // clear form
    nameEl.value = "";
    amountEl.value = "";
  });
}

// This is called if line 146-148 are fired due to an error happening in the fetch request aka if the browser isnt connected too the internet.  
function saveRecord (transaction) {
    // Example value being passed through this function
    // { name: "Deposit", 
    //   value: "1000", 
    //   date: "2021-12-08T18:27:20.630Z" 
    // }

  //With the object we need to push it to our empty globally declared array allOfflineTransactions so then we can insert them later.
  allOfflineTransactions.push(transaction)
  console.log(allOfflineTransactions)
  //With this parameter we are receiving a data object that looks like
  //We firstly need to ensure the browser the user is using supports indexdb
  if(!window.indexedDB) {
    console.log('Your browser doesnt currently support IndexDb')
      return
  }
    let db
    let request = window.indexedDB.open('offlineLedger', 1)
    
    request.onerror = event => {
      console.log(event.target.errorCode)
    }

    //This is where any options for the db is implemented
    request.onupgradeneeded = event => {
      const db = event.target.result
      db.createObjectStore('savedTransactions', {
        keyPath: 'id', autoIncrement: true,
      })
    }

    request.onsuccess = event => {
        db = event.target.result
        //If a successful DOM event occurs then we want to access or objectStore via our db object so then we can start adding and deleting data.
        let transaction = db.transaction('savedTransactions', "readwrite")
        // You can access multiple objectStores in one transaction but since we are only worried about storing the transactions for one use we will just use one instead of passing multiple through using an array like they do in the indexDB documentation. 
        //We dont have to pass anything through the second parameter but if we dont then it will default to a read only transaciton which would prevent us from manipulating the data.
        transaction.oncomplete = function(event){
          console.log('The most recent submited transaction has been saved into indexDb awaiting an internet connection!')
        }
        transaction.onerror = function(event){
          console.log(event)
        } 
        //Although we currently only have one object store we have to still have to create an instance calling the object store.
        const objectStore = transaction.objectStore('savedTransactions')

        allOfflineTransactions.forEach(savedTransaction => {
            const addRequest = objectStore.add(savedTransaction)
            addRequest.onsuccess = event => console.log(`${savedTransaction.name} was added to indexDB`)

        })


    }

    
}



document.querySelector("#add-btn").onclick = function() {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function() {
  sendTransaction(false);
};