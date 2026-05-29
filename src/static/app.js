document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const askModeButton = document.getElementById("ask-mode-button");
  const messageDiv = document.getElementById("message");

  let askModeActive = false;
  let askModeUsed = false;

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");
  } 

  askModeButton.addEventListener("click", () => {
    askModeActive = true;
    askModeUsed = false;
    askModeButton.textContent = "Ask Mode enabled for first interaction";
    askModeButton.disabled = true;
    showMessage("Ask Mode is ready. Your next sign-up will be treated as the first interaction.", "info");
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantItems = details.participants
          .map(
            (participant) => `
              <li>
                <span class="participant-name">${participant}</span>
                <button type="button" class="participant-delete" data-activity="${encodeURIComponent(
                  name
                )}" data-email="${encodeURIComponent(participant)}" aria-label="Remove ${participant}">
                  ×
                </button>
              </li>`
          )
          .join("");
        const participantsHtml = participantItems
          ? `<div class="participants-block">
              <p class="participant-heading">Participants:</p>
              <ul class="participants-list">${participantItems}</ul>
            </div>`
          : `<p class="participants-empty"><strong>Participants:</strong> None yet</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  activitiesList.addEventListener("click", async (event) => {
    const button = event.target.closest(".participant-delete");
    if (!button) return;

    const activityName = decodeURIComponent(button.dataset.activity);
    const participantEmail = decodeURIComponent(button.dataset.email);

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(participantEmail)}`,
        { method: "DELETE" }
      );

      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");
        await fetchActivities();
      } else {
        showMessage(result.detail || "Failed to remove participant", "error");
      }
    } catch (error) {
      showMessage("Failed to remove participant. Please try again.", "error");
      console.error("Error removing participant:", error);
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        let messageText = result.message;

        if (askModeActive && !askModeUsed) {
          messageText = `Ask Mode first interaction: ${messageText}`;
          askModeUsed = true;
          askModeActive = false;
          askModeButton.textContent = "Enable Ask Mode for first interaction";
          askModeButton.disabled = false;
        }

        messageDiv.textContent = messageText;
        messageDiv.className = "message success";
        signupForm.reset();
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
        if (askModeActive && !askModeUsed) {
          askModeButton.disabled = false;
        }
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      if (askModeActive && !askModeUsed) {
        askModeButton.disabled = false;
      }
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
