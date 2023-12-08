document.addEventListener('DOMContentLoaded', () => {
    const patientForm = document.getElementById('patientForm');
    const patientIDField = document.getElementById('patientID');
    const generatedPatientIDField = document.getElementById('generatedPatientID');

    // Set the initial value of the generatedPatientIDField to an empty string
    generatedPatientIDField.value = '';

    // Generate a new patient ID when the page loads
    generatePatientID().then((id) => {
        patientIDField.value = id;
        generatedPatientIDField.value = id; // Set the generated ID to the input field
    });

    patientForm.addEventListener('submit', async (e) => {
        // e.preventDefault();
        // Handle form submission, create a new patient, and send the data to the server
    });
});

// You don't need this if you're generating the patient ID entirely on the client-side
async function generatePatientID() {
    console.log('Generating patient ID...');
    const response = await fetch('/api/generate-patient-id');
    const data = await response.json();
    return data.patientID;
}