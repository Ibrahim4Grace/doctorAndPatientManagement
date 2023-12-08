
const doctorNameDropdown = document.getElementById("doctorName");
const doctorEmailInput = document.getElementById("doctorEmail");
const specialtyInput = document.getElementById("specialty");

// Fetch the list of doctors from the server
fetch('/api/doctors')
  .then(response => response.json())
  .then(doctors => {
    // Attach an event listener to update the email
    doctorNameDropdown.addEventListener("change", function() {
      const selectedDoctor = doctorNameDropdown.value;
      const selectedDoctorInfo = doctors.find(doctor => doctor.flname === selectedDoctor); // Update 'name' to 'flname'
      if (selectedDoctorInfo) {
        doctorEmailInput.value = selectedDoctorInfo.email;
        specialtyInput.value = selectedDoctorInfo.specialty;
      } else {
        doctorEmailInput.value = ''; // Clear the email input
        specialtyInput.value = '';
      }
    });
  })
  .catch(error => {
    console.error("Error fetching doctor data:", error);
  });
