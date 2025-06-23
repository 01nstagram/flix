
/**
 * DreamCria - Plataforma de Streaming
 * Sistema principal de gerenciamento da aplicação
 * 
 * Recursos:
 * - Carregamento dinâmico de conteúdo da API TMDb
 * - Sistema de busca em tempo real
 * - Lazy loading otimizado para imagens
 * - Infinite scroll para melhor UX
 * - Navegação fluida entre categorias
 * 
 * Quer ter um site/bot customizado? Chame: @v33s3l na DM e faça seu orçamento.
 */

// ===== CONFIGURAÇÕES DA API =====
const API_CONFIG = {
    key: 'cf72f14362cff1da8bed9fa86831de66',
    baseUrl: 'https://api.themoviedb.org/3',
    imageUrl: 'https://image.tmdb.org/t/p/w500',
    posterUrl: 'https://image.tmdb.org/t/p/w200',
    backdropUrl: 'https://image.tmdb.org/t/p/original'
};

// ===== GERENCIADOR PRINCIPAL DA APLICAÇÃO =====
/**
 * Classe principal da aplicação DreamCria
 * Gerencia todo o ciclo de vida da aplicação, incluindo:
 * - Carregamento de conteúdo da API
 * - Sistema de navegação e filtros
 * - Otimizações de performance
 * - Gerenciamento de estado da aplicação
 */
class DreamCriaApp {
    constructor() {
        this.currentHeroIndex = 0;        // Índice atual do banner hero
        this.heroContent = [];            // Array com conteúdo do banner
        this.isLoading = false;           // Estado de carregamento
        this.currentFilter = 'all';       // Filtro ativo atual
        this.searchTimeout = null;        // Timeout para debounce da busca
        this.autoHeroInterval = null;     // Interval para rotação do hero
        this.imageObserver = null;        // Observer para lazy loading
        
        this.init();
    }

    /**
     * Inicializa a aplicação
     * Configura todos os componentes necessários para funcionamento
     */
    async init() {
        try {
            this.setupImageObserver();
            await this.loadInitialContent();
            this.setupEventListeners();
            this.startAutoHero();
            console.log('🎬 DreamCria inicializado com sucesso!');
        } catch (error) {
            console.error('Erro ao inicializar:', error);
        }
    }

    /**
     * Configura o Intersection Observer para lazy loading de imagens
     * Melhora performance carregando imagens apenas quando necessário
     */
    setupImageObserver() {
        // Intersection Observer para lazy loading otimizado
        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.dataset.src;
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        img.classList.remove('lazy-image');
                        this.imageObserver.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });
    }

    observeImage(img) {
        if (this.imageObserver && img) {
            this.imageObserver.observe(img);
        }
    }

    async loadInitialContent() {
        this.setLoading(true);
        
        try {
            // Carregar conteúdo para o hero banner
            await this.loadHeroContent();
            
            // Carregar todas as seções
            await Promise.all([
                this.loadTrending(),
                this.loadPopularMovies(),
                this.loadPopularSeries(),
                this.loadAnimes(),
                this.loadActionMovies(),
                this.loadComedies(),
                this.loadDramas(),
                this.loadHorrorMovies(),
                this.loadSciFiMovies(),
                this.loadRomanceMovies()
            ]);
            
        } catch (error) {
            console.error('Erro ao carregar conteúdo inicial:', error);
        } finally {
            this.setLoading(false);
        }
    }

    async loadHeroContent() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/movie/popular?api_key=${API_CONFIG.key}&language=pt-BR&page=1`);
            const data = await response.json();
            
            this.heroContent = data.results.slice(0, 5).filter(movie => movie.backdrop_path);
            this.updateHero();
        } catch (error) {
            console.error('Erro ao carregar hero:', error);
        }
    }

    updateHero() {
        if (this.heroContent.length === 0) return;
        
        const movie = this.heroContent[this.currentHeroIndex];
        const heroBanner = document.getElementById('heroBanner');
        const heroBackground = heroBanner?.querySelector('.hero-background');
        const heroTitle = document.getElementById('hero-title');
        const heroDescription = heroBanner?.querySelector('.hero-description');
        const heroPlayBtn = document.getElementById('heroPlayBtn');
        const heroInfoBtn = document.getElementById('heroInfoBtn');

        if (heroBackground) {
            heroBackground.style.backgroundImage = `url(${API_CONFIG.backdropUrl}${movie.backdrop_path})`;
        }
        
        if (heroTitle) heroTitle.textContent = movie.title;
        if (heroDescription) {
            heroDescription.textContent = this.truncateText(movie.overview, 200);
        }
        
        if (heroPlayBtn) {
            heroPlayBtn.onclick = () => this.openMediaPage(movie.id, 'movie');
        }
        
        if (heroInfoBtn) {
            heroInfoBtn.onclick = () => this.openMediaPage(movie.id, 'movie');
        }
    }

    startAutoHero() {
        this.autoHeroInterval = setInterval(() => {
            if (this.heroContent.length > 1) {
                this.currentHeroIndex = (this.currentHeroIndex + 1) % this.heroContent.length;
                this.updateHero();
            }
        }, 10000); // Muda a cada 10 segundos
    }

    async loadTrending() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/trending/all/day?api_key=${API_CONFIG.key}&language=pt-BR`);
            const data = await response.json();
            this.renderCarousel('trendingCarousel', data.results.slice(0, 20));
        } catch (error) {
            console.error('Erro ao carregar em alta:', error);
        }
    }

    async loadPopularMovies() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/movie/popular?api_key=${API_CONFIG.key}&language=pt-BR&page=1`);
            const data = await response.json();
            this.renderCarousel('moviesCarousel', data.results, 'movie');
        } catch (error) {
            console.error('Erro ao carregar filmes populares:', error);
        }
    }

    async loadPopularSeries() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/discover/tv?api_key=${API_CONFIG.key}&language=pt-BR&sort_by=vote_average.desc&vote_count.gte=1000&page=1`);
            const data = await response.json();
            // Filtrar séries com nota >= 7.5 para garantir qualidade
            const topRatedResults = data.results.filter(series => series.vote_average >= 7.5);
            this.renderCarousel('seriesCarousel', topRatedResults, 'tv');
        } catch (error) {
            console.error('Erro ao carregar séries populares:', error);
        }
    }

    async loadAnimes() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/discover/tv?api_key=${API_CONFIG.key}&language=pt-BR&with_genres=16&sort_by=vote_average.desc&vote_count.gte=500&page=1`);
            const data = await response.json();
            // Filtrar animes com nota >= 7.0 (animes têm audiência específica mas exigente)
            const topRatedResults = data.results.filter(anime => anime.vote_average >= 7.0);
            this.renderCarousel('animesCarousel', topRatedResults, 'anime');
        } catch (error) {
            console.error('Erro ao carregar animes:', error);
        }
    }

    async loadActionMovies() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/discover/movie?api_key=${API_CONFIG.key}&language=pt-BR&with_genres=28&sort_by=vote_average.desc&vote_count.gte=1000&page=1`);
            const data = await response.json();
            // Filtrar filmes com nota >= 7.0 para garantir qualidade
            const topRatedResults = data.results.filter(movie => movie.vote_average >= 7.0);
            this.renderCarousel('actionCarousel', topRatedResults, 'movie');
        } catch (error) {
            console.error('Erro ao carregar filmes de ação:', error);
        }
    }

    async loadComedies() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/discover/movie?api_key=${API_CONFIG.key}&language=pt-BR&with_genres=35&sort_by=vote_average.desc&vote_count.gte=500&page=1`);
            const data = await response.json();
            // Filtrar comédias com nota >= 6.5 (comédias tendem a ter notas menores)
            const topRatedResults = data.results.filter(movie => movie.vote_average >= 6.5);
            this.renderCarousel('comedyCarousel', topRatedResults, 'movie');
        } catch (error) {
            console.error('Erro ao carregar comédias:', error);
        }
    }

    async loadDramas() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/discover/movie?api_key=${API_CONFIG.key}&language=pt-BR&with_genres=18&sort_by=vote_average.desc&vote_count.gte=1000&page=1`);
            const data = await response.json();
            // Filtrar dramas com nota >= 7.5 (dramas costumam ter notas altas)
            const topRatedResults = data.results.filter(movie => movie.vote_average >= 7.5);
            this.renderCarousel('dramaCarousel', topRatedResults, 'movie');
        } catch (error) {
            console.error('Erro ao carregar dramas:', error);
        }
    }

    async loadHorrorMovies() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/discover/movie?api_key=${API_CONFIG.key}&language=pt-BR&with_genres=27&sort_by=vote_average.desc&vote_count.gte=500&page=1`);
            const data = await response.json();
            // Filtrar filmes de terror com nota >= 6.0 (terror tem audiência específica)
            const topRatedResults = data.results.filter(movie => movie.vote_average >= 6.0);
            this.renderCarousel('horrorCarousel', topRatedResults, 'movie');
        } catch (error) {
            console.error('Erro ao carregar filmes de terror:', error);
        }
    }

    async loadSciFiMovies() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/discover/movie?api_key=${API_CONFIG.key}&language=pt-BR&with_genres=878&sort_by=vote_average.desc&vote_count.gte=1000&page=1`);
            const data = await response.json();
            // Filtrar ficção científica com nota >= 7.0
            const topRatedResults = data.results.filter(movie => movie.vote_average >= 7.0);
            this.renderCarousel('scifiCarousel', topRatedResults, 'movie');
        } catch (error) {
            console.error('Erro ao carregar ficção científica:', error);
        }
    }

    async loadRomanceMovies() {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}/discover/movie?api_key=${API_CONFIG.key}&language=pt-BR&with_genres=10749&sort_by=vote_average.desc&vote_count.gte=500&page=1`);
            const data = await response.json();
            // Filtrar romances com nota >= 6.5
            const topRatedResults = data.results.filter(movie => movie.vote_average >= 6.5);
            this.renderCarousel('romanceCarousel', topRatedResults, 'movie');
        } catch (error) {
            console.error('Erro ao carregar romances:', error);
        }
    }

    renderCarousel(carouselId, items, mediaType = null) {
        const carousel = document.getElementById(carouselId);
        if (!carousel || !items) return;

        carousel.innerHTML = '';
        
        items.forEach(item => {
            if (!item.poster_path) return;
            
            const type = mediaType || this.getMediaType(item);
            const card = this.createMediaCard(item, type);
            carousel.appendChild(card);
        });
    }

    createMediaCard(item, type) {
        const title = item.title || item.name || 'Título não disponível';
        const year = this.extractYear(item.release_date || item.first_air_date);
        const rating = (item.vote_average || 0).toFixed(1);
        const posterUrl = item.poster_path ? `${API_CONFIG.posterUrl}${item.poster_path}` : this.getPlaceholderImage();

        const card = document.createElement('div');
        card.className = 'media-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `Abrir detalhes de ${title}`);
        
        // Implementar lazy loading otimizado
        card.innerHTML = `
            <img 
                data-src="${posterUrl}" 
                alt="Poster de ${title}" 
                loading="lazy"
                class="lazy-image"
                style="background: linear-gradient(45deg, #1a1a3a, #2d2d5f); min-height: 280px;"
            >
            <div class="media-info">
                <h3 class="media-title">${title}</h3>
                <div class="media-meta">
                    <span class="media-rating">⭐ ${rating}</span>
                    <span class="media-year">${year}</span>
                </div>
            </div>
        `;

        // Lazy loading das imagens
        const img = card.querySelector('.lazy-image');
        this.observeImage(img);

        // Event listeners otimizados
        const openDetails = () => this.openMediaPage(item.id, type);
        card.addEventListener('click', openDetails, { passive: true });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openDetails();
            }
        }, { passive: false });

        return card;
    }

    getMediaType(item) {
        if (item.title) return 'movie';
        if (item.name) return 'tv';
        return 'movie';
    }

    extractYear(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).getFullYear() || 'N/A';
        } catch {
            return 'N/A';
        }
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMTkxOTM5Ii8+CjxwYXRoIGQ9Ik0xNTAgMjI1QzE2NC44NTMgMjI1IDE3NyAyMTIuODUzIDE3NyAyMjVDMTc3IDIzNy4xNDcgMTY0Ljg1MyAyNDkgMTUwIDI0OUMxMzUuMTQ3IDI0OSAxMjMgMjM3LjE0NyAxMjMgMjI1QzEyMyAyMTIuODUzIDEzNS4xNDcgMjI1IDE1MCAyMjVaIiBmaWxsPSIjNjM2M2YxIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTRhM2I4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+U2VtIEltYWdlbTwvdGV4dD4KPC9zdmc+';
    }

    openMediaPage(id, type) {
        let pageType;
        switch (type) {
            case 'movie':
                pageType = '/filme';
                break;
            case 'anime':
                pageType = '/anime';
                break;
            case 'tv':
            default:
                pageType = '/serie';
                break;
        }
        
        // Smooth page transition
        document.body.style.opacity = '0.8';
        setTimeout(() => {
            window.location.href = `${pageType}?id=${id}`;
        }, 150);
    }

    truncateText(text, maxLength = 150) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = loading ? 'flex' : 'none';
        }
    }

    setupEventListeners() {
        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const category = link.getAttribute('data-category');
                this.filterContent(category);
                
                // Update active state
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });

        // Search functionality
        this.setupSearch();

        // Infinite scroll (otimizado)
        this.setupInfiniteScroll();

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                this.toggleSearch();
            }
        });

        // Header scroll effect (otimizado)
        this.setupHeaderScroll();
    }

    setupSearch() {
        const searchToggle = document.querySelector('.search-toggle');
        const searchMenu = document.querySelector('.search-menu');
        const searchInput = document.querySelector('.search-input');
        const searchResults = document.getElementById('searchResults');

        if (!searchToggle || !searchMenu || !searchInput || !searchResults) return;

        // Toggle search menu
        searchToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            searchMenu.classList.toggle('active');
            if (searchMenu.classList.contains('active')) {
                searchInput.focus();
            }
        });

        // Search input
        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }

            this.searchTimeout = setTimeout(() => this.performSearch(query), 500);
        });

        // Search on Enter key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query.length >= 2) {
                    window.location.href = `/busca?q=${encodeURIComponent(query)}`;
                }
            }
        });

        // Close search when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchMenu.contains(e.target) && e.target !== searchToggle) {
                searchMenu.classList.remove('active');
            }
        });
    }

    async performSearch(query) {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;

        try {
            searchResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">Buscando...</div>';

            const [moviesResponse, tvResponse] = await Promise.all([
                fetch(`${API_CONFIG.baseUrl}/search/movie?api_key=${API_CONFIG.key}&language=pt-BR&query=${encodeURIComponent(query)}`),
                fetch(`${API_CONFIG.baseUrl}/search/tv?api_key=${API_CONFIG.key}&language=pt-BR&query=${encodeURIComponent(query)}`)
            ]);

            const [moviesData, tvData] = await Promise.all([
                moviesResponse.json(),
                tvResponse.json()
            ]);

            const allResults = [
                ...moviesData.results.map(item => ({ ...item, type: 'movie' })),
                ...tvData.results.map(item => ({ ...item, type: 'tv' }))
            ].filter(item => item.poster_path).slice(0, 8);

            if (allResults.length === 0) {
                searchResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">Nenhum resultado encontrado</div>';
                return;
            }

            searchResults.innerHTML = allResults.map(item => {
                const title = item.title || item.name;
                const year = this.extractYear(item.release_date || item.first_air_date);
                const rating = (item.vote_average || 0).toFixed(1);
                
                return `
                    <div class="search-result-item" onclick="app.openMediaPage(${item.id}, '${item.type}')" style="cursor: pointer;">
                        <img src="${API_CONFIG.posterUrl}${item.poster_path}" alt="${title}" loading="lazy">
                        <div>
                            <div style="font-weight: 600; color: var(--text-primary);">${title}</div>
                            <small style="color: var(--text-muted);">${year} • ⭐ ${rating}</small>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Erro na busca:', error);
            searchResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: #ef4444;">Erro ao buscar</div>';
        }
    }

    toggleSearch() {
        const searchMenu = document.querySelector('.search-menu');
        const searchInput = document.querySelector('.search-input');
        
        if (searchMenu) {
            searchMenu.classList.toggle('active');
            if (searchMenu.classList.contains('active') && searchInput) {
                searchInput.focus();
            }
        }
    }

    filterContent(category) {
        this.currentFilter = category;
        
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.style.display = 'block';
        });

        // Aplicar filtros se necessário
        if (category !== 'all') {
            sections.forEach(section => {
                const sectionId = section.id;
                let shouldShow = false;

                switch (category) {
                    case 'movie':
                        shouldShow = ['trendingSection', 'moviesSection', 'actionSection', 'comedySection', 'dramaSection', 'horrorSection', 'scifiSection', 'romanceSection'].includes(sectionId);
                        break;
                    case 'tv':
                        shouldShow = ['seriesSection', 'trendingSection'].includes(sectionId);
                        break;
                    case 'anime':
                        shouldShow = ['animesSection'].includes(sectionId);
                        break;
                }

                section.style.display = shouldShow ? 'block' : 'none';
            });
        }
    }

    setupInfiniteScroll() {
        let scrollTimeout;
        
        window.addEventListener('scroll', () => {
            // Throttle scroll events para melhor performance
            if (scrollTimeout) return;
            
            scrollTimeout = setTimeout(() => {
                const scrollPosition = window.innerHeight + window.scrollY;
                const documentHeight = document.documentElement.offsetHeight;
                
                // Carregar mais conteúdo quando estiver próximo do final
                if (scrollPosition >= documentHeight - 1000 && !this.isLoading) {
                    this.loadMoreContent();
                }
                
                scrollTimeout = null;
            }, 100); // Throttle de 100ms
        }, { passive: true });
    }

    async loadMoreContent() {
        // Implementar carregamento adicional de conteúdo
        // Por enquanto, apenas um placeholder
        console.log('Carregando mais conteúdo...');
    }

    setupHeaderScroll() {
        let headerScrollTimeout;
        let lastScrollY = 0;
        
        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;
            
            // Só atualiza se houve mudança significativa
            if (Math.abs(currentScrollY - lastScrollY) < 10) return;
            
            if (headerScrollTimeout) return;
            
            headerScrollTimeout = setTimeout(() => {
                const header = document.querySelector('.header');
                if (header) {
                    const scrolled = currentScrollY > 100;
                    header.style.background = scrolled 
                        ? 'rgba(15, 15, 35, 0.98)' 
                        : 'rgba(15, 15, 35, 0.95)';
                }
                lastScrollY = currentScrollY;
                headerScrollTimeout = null;
            }, 50);
        }, { passive: true });
    }
}

// ===== INICIALIZAÇÃO =====
let app;

function initializeApp() {
    app = new DreamCriaApp();
}

// Inicializar quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export para debugging
if (typeof window !== 'undefined') {
    window.DreamCria = { app };
}
