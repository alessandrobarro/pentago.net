
let nickname = "";
let nicknameInput = document.getElementById("playername");
let gmodeInput = document.getElementById("buttonImage");
let gamekeyInput = document.getElementById("formg");
const loopback_key = '000000';

function setNickname() {
  if (nicknameInput.value === '') {
    nicknameInput.value = 'Player';
  } else {
    nickname = nicknameInput.value;
  }
  localStorage.clear()
  localStorage.setItem("nickname", nickname);
}

function play_public_game() {
  setNickname();
  localStorage.setItem("gType", gType);
}

function create_private_game() {
  setNickname();
  localStorage.setItem("gType", gType);
  localStorage.setItem("gKey", loopback_key);
}

function join_private_game() {
  if (gamekeyInput.value === '') {
    alert("Please insert a valid room number");
    location.reload();
  } else {
    if (nicknameInput.value === '') {
      nickname = 'Player';
    } else {
      nickname = nicknameInput.value;
    }
    localStorage.clear();
    localStorage.setItem("gType", gType);
    localStorage.setItem("gKey", gamekeyInput.value);
    localStorage.setItem("nickname", nickname);

    window.open("pentago-gamepage.html", "_blank");
  }
}

if(nicknameInput){
  nicknameInput.addEventListener("keyup", function(event) {
    event.preventDefault();
    if (event.keyCode === 13) {
      document.getElementById("playbtn").click();
    }
  });
}
