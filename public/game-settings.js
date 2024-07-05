document.addEventListener("DOMContentLoaded", function() {
  let nickname = '';
  let nicknameInput = document.getElementById("playername");
  let gmodeInput = document.getElementById("buttonImage");
  let gamekeyInput = document.getElementById("formg");
  const loopback_key = '000000';
  let gType = '0';
  let diff = 'easy';

  function getNickname() {
      let nickname = prompt("Please enter your nickname:");
      if (!nickname) nickname = "Player";  // Default nickname if none entered
      localStorage.clear();
      localStorage.setItem("nickname", nickname);
      return nickname;
  }

  function startGamePublic() {
      let nickname = getNickname();
      gType = '0';
      localStorage.setItem("gType", gType); // Public Game
      window.open("pentago-gamepage.html", "_blank");
  }

  function startGamePrivate() {
      let nickname = getNickname();
      gType = '1';
      localStorage.setItem("gType", gType); // Private Game
      localStorage.setItem("gKey", loopback_key);
      window.open("pentago-gamepage.html", "_blank");
  }

  function joinGamePrivate() {
      gType = '1';
      let gKey = gamekeyInput.value;
      if (gamekeyInput.value === '') {
          alert("Please insert a valid room number");
          location.reload();
      } else {
          let nickname = getNickname();
          localStorage.clear();
          localStorage.setItem("gType", gType);
          localStorage.setItem("gKey", gKey);
          localStorage.setItem("nickname", nickname);
          window.open("pentago-gamepage.html", "_blank");
      }
  }

  function openPrivateGamePopup() {
      event.preventDefault();
      var popup = document.getElementById("private-game-popup");
      popup.style.display = "block";
      popup.style.position = "absolute";
      popup.style.left = "50%";
      popup.style.transform = "translateX(-50%)"; // Centers the popup
  }

  function closePrivateGamePopup() {
      event.preventDefault();
      var popup = document.getElementById("private-game-popup");
      popup.style.display = "none";
  }


  function toggleDifficultyOptions() {
    var options = document.getElementById('ai-difficulty-options');
    console.log("Current display style:", options.style.display);  // Check the current display property
    if (options.style.display === 'none' || options.style.display === '') {
        options.style.display = 'block';
    } else {
        options.style.display = 'none';
    }
}



function startGameAI() {
    let nickname = getNickname();
    var selectedDifficulty = document.querySelector('input[name="difficulty"]:checked').value;
    localStorage.setItem('diff', selectedDifficulty);
    console.log('Starting AI Game with difficulty:', selectedDifficulty);
    toggleDifficultyOptions();
    window.open("pentago-gamepage-sp.html", "_blank");

}



  // Expose functions to global scope
  window.startGamePublic = startGamePublic;
  window.startGamePrivate = startGamePrivate;
  window.joinGamePrivate = joinGamePrivate;
  window.openPrivateGamePopup = openPrivateGamePopup;
  window.closePrivateGamePopup = closePrivateGamePopup;
  window.startGameAI = startGameAI;
  window.toggleDifficultyOptions = toggleDifficultyOptions;
});
