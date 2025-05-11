// Common functionality for the classroom application
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize Bootstrap tooltips if Bootstrap is loaded
        if (typeof bootstrap !== 'undefined' && typeof bootstrap.Tooltip !== 'undefined') {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            tooltipTriggerList.forEach(function(tooltipTriggerEl) {
                new bootstrap.Tooltip(tooltipTriggerEl);
            });
        }

        // Handle file input display
        const fileInputs = document.querySelectorAll('.custom-file-input');
        fileInputs.forEach(input => {
            input.addEventListener('change', function(e) {
                try {
                    const fileName = e.target.files[0]?.name || 'No file chosen';
                    const label = this.nextElementSibling;
                    if (label) {
                        label.textContent = fileName;
                    }
                } catch (err) {
                    console.error('Error handling file input:', err);
                }
            });
        });

        // Add form validation
        const forms = document.querySelectorAll('.needs-validation');
        forms.forEach(form => {
            form.addEventListener('submit', function(event) {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            });
        });

        // Handle announcement form
        const announcementForm = document.getElementById('announcementForm');
        if (announcementForm) {
            announcementForm.addEventListener('submit', function(event) {
                const content = document.getElementById('announcement');
                if (!content || !content.value.trim()) {
                    event.preventDefault();
                    alert('Please enter an announcement');
                }
            });
        }
    } catch (err) {
        console.error('Error initializing scripts:', err);
    }
});
