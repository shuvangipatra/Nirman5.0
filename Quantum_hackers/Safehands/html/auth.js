// signup → backend API
document.getElementById("signupForm").addEventListener("submit", async function(e){
    e.preventDefault();

    let data = {
        name: signupName.value,
        email: signupEmail.value,
        password: signupPassword.value
    };

    let res = await fetch("http://127.0.0.1:5000/signup", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    });

    let out = await res.json();
    alert(out.message);
});
