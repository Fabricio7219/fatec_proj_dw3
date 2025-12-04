document.addEventListener('DOMContentLoaded', () => {
    let currentSlideIndex = 0;
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    const track = document.getElementById('carouselTrack');
    const prevBtn = document.querySelector('.carousel-btn.prev');
    const nextBtn = document.querySelector('.carousel-btn.next');

    if (!track || slides.length === 0) return;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        // Ensure index is within bounds
        if (index >= slides.length) index = 0;
        if (index < 0) index = slides.length - 1;

        slides[index].classList.add('active');
        dots[index].classList.add('active');
        
        // If using transform for sliding effect (optional based on CSS, but kept from original)
        // track.style.transform = `translateX(-${index * 100}%)`; 
        // Note: The original code had this, but if CSS handles .active visibility, it might be redundant or conflicting if not styled for sliding.
        // Let's keep it consistent with the original logic.
        track.style.transform = `translateX(-${index * 100}%)`;
        
        currentSlideIndex = index;
    }

    function moveSlide(direction) {
        let newIndex = currentSlideIndex + direction;
        
        if (newIndex >= slides.length) {
            newIndex = 0;
        } else if (newIndex < 0) {
            newIndex = slides.length - 1;
        }
        
        showSlide(newIndex);
    }

    function currentSlide(index) {
        showSlide(index - 1); // index is 1-based from dots
    }

    // Event Listeners
    if (prevBtn) {
        prevBtn.addEventListener('click', () => moveSlide(-1));
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => moveSlide(1));
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => currentSlide(index + 1));
    });

    // Auto play
    setInterval(() => {
        moveSlide(1);
    }, 5000);
});
