
/**
 * DreamCria - Sistema de Páginas de Filmes
 * Gerencia exibição detalhada de filmes individuais
 * 
 * Funcionalidades:
 * - Carregamento de detalhes do filme via API TMDb
 * - Exibição de elenco, trailer e informações técnicas
 * - Sistema de streaming integrado
 * - Interface responsiva e acessível
 * 
 * Quer ter um site/bot customizado? Chame: @v33s3l na DM e faça seu orçamento.
 */

// ===== CONFIGURAÇÕES DA API =====
const API_CONFIG = {
    key: 'cf72f14362cff1da8bed9fa86831de66',
    baseUrl: 'https://api.themoviedb.org/3',
    imageUrl: 'https://image.tmdb.org/t/p/original',
    posterUrl: 'https://image.tmdb.org/t/p/w200',
    profileUrl: 'https://image.tmdb.org/t/p/w200',
    streamUrl: 'https://embed.warezcdn.link/filme/'
};

// ===== GERENCIADOR DE ESTADO =====
class MoviePageManager {
    constructor() {
        this.movieId = null;
        this.movieData = null;
        this.isLoading = false;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Botão de reprodução
        const playButton = document.querySelector('.play-button');
        if (playButton) {
            playButton.addEventListener('click', () => this.openStreamModal());
        }

        // Busca no header
        this.initializeSearch();
        
        // Modal de stream
        this.initializeStreamModal();

        // Scroll suave para detalhes
        window.scrollToDetails = () => this.scrollToDetails();
        window.proceedToWatch = () => this.proceedToWatch();
        window.cancelStream = () => this.cancelStream();
    }

    initializeSearch() {
        const searchIcon = document.querySelector('.search-toggle');
        const searchMenu = document.querySelector('.search-menu');
        const searchInput = document.querySelector('.search-input');
        const searchResults = document.getElementById('searchResults');

        if (!searchIcon || !searchMenu || !searchInput || !searchResults) return;

        // Toggle do menu de busca
        searchIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            searchMenu.classList.toggle('active');
            if (searchMenu.classList.contains('active')) {
                searchInput.focus();
            }
        });

        // Busca em tempo real
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }

            searchTimeout = setTimeout(() => this.performSearch(query), 300);
        });

        // Fechar menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (!searchMenu.contains(e.target) && e.target !== searchIcon) {
                searchMenu.classList.remove('active');
            }
        });
    }

    async performSearch(query) {
        const searchResults = document.getElementById('searchResults');
        if (!searchResults) return;

        try {
            searchResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">Buscando...</div>';

            const response = await fetch(`${API_CONFIG.baseUrl}/search/movie?api_key=${API_CONFIG.key}&language=pt-BR&query=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                searchResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-muted);">Nenhum resultado encontrado</div>';
                return;
            }

            const filteredResults = data.results
                .filter(movie => movie.poster_path)
                .slice(0, 5);

            searchResults.innerHTML = filteredResults.map(movie => `
                <div class="search-result-item" onclick="window.location.href='filme.html?id=${movie.id}'" style="cursor: pointer;">
                    <img src="${API_CONFIG.posterUrl}${movie.poster_path}" alt="${movie.title}" loading="lazy">
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">${movie.title}</div>
                        <small style="color: var(--text-muted);">${new Date(movie.release_date || '').getFullYear() || 'N/A'} • ⭐ ${(movie.vote_average || 0).toFixed(1)}</small>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Erro na busca:', error);
            searchResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: #ef4444;">Erro ao buscar filmes</div>';
        }
    }

    initializeStreamModal() {
        const streamModal = document.getElementById('streamModal');
        const closeStream = document.getElementById('closeStream');
        const modalBackdrop = document.querySelector('.modal-backdrop');

        if (closeStream) {
            closeStream.addEventListener('click', () => this.cancelStream());
        }

        if (modalBackdrop) {
            modalBackdrop.addEventListener('click', () => this.cancelStream());
        }

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && streamModal?.classList.contains('active')) {
                this.cancelStream();
            }
        });
    }

    scrollToDetails() {
        const detailsSection = document.getElementById('movieDetailsSection');
        if (detailsSection) {
            detailsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = loading ? 'flex' : 'none';
        }
    }

    formatCurrency(amount) {
        if (!amount || amount === 0) return 'Não informado';
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDuration(minutes) {
        if (!minutes) return 'Não informado';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
    }

    getLanguageName(code) {
        const languages = {
            'en': 'Inglês',
            'pt': 'Português',
            'es': 'Espanhol',
            'fr': 'Francês',
            'de': 'Alemão',
            'it': 'Italiano',
            'ja': 'Japonês',
            'ko': 'Coreano',
            'zh': 'Chinês',
            'ru': 'Russo'
        };
        return languages[code] || code.toUpperCase();
    }

    async loadMovieDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        this.movieId = urlParams.get('id');
        
        if (!this.movieId) {
            this.showError("ID do filme não encontrado na URL");
            return;
        }

        try {
            this.setLoading(true);

            // Buscar dados do filme em paralelo
            const [movieResponse, creditsResponse, videosResponse] = await Promise.all([
                fetch(`${API_CONFIG.baseUrl}/movie/${this.movieId}?api_key=${API_CONFIG.key}&language=pt-BR`),
                fetch(`${API_CONFIG.baseUrl}/movie/${this.movieId}/credits?api_key=${API_CONFIG.key}&language=pt-BR`),
                fetch(`${API_CONFIG.baseUrl}/movie/${this.movieId}/videos?api_key=${API_CONFIG.key}&language=pt-BR`)
            ]);

            if (!movieResponse.ok) {
                throw new Error(`Erro ${movieResponse.status}: ${movieResponse.statusText}`);
            }

            const [movieData, creditsData, videosData] = await Promise.all([
                movieResponse.json(),
                creditsResponse.json(),
                videosResponse.json()
            ]);

            this.movieData = movieData;
            this.renderMovieData(movieData, creditsData, videosData);

        } catch (error) {
            console.error('Erro ao carregar filme:', error);
            this.showError("Erro ao carregar detalhes do filme. Tente novamente.");
        } finally {
            this.setLoading(false);
        }
    }

    renderMovieData(movieData, creditsData, videosData) {
        try {
            // Atualizar banner
            this.updateBanner(movieData);
            
            // Atualizar detalhes
            this.updateDetails(movieData);
            
            // Atualizar elenco
            this.updateCast(creditsData);
            
            // Atualizar trailer
            this.updateTrailer(videosData);

            // Atualizar título da página
            document.title = `${movieData.title} - DreamCria`;

        } catch (error) {
            console.error('Erro ao renderizar dados:', error);
            this.showError("Erro ao exibir informações do filme");
        }
    }

    updateBanner(movieData) {
        const banner = document.getElementById("movieBanner");
        const title = document.getElementById("movieTitle");
        const year = document.getElementById("movieYear");
        const rating = document.getElementById("movieRating");
        const genre = document.getElementById("movieGenre");
        const synopsis = document.getElementById("movieSynopsis");

        if (banner && movieData.backdrop_path) {
            banner.style.backgroundImage = `url(${API_CONFIG.imageUrl}${movieData.backdrop_path})`;
        }

        if (title) {
            title.textContent = movieData.title || 'Título não disponível';
        }

        if (year && movieData.release_date) {
            year.textContent = new Date(movieData.release_date).getFullYear();
        }

        if (rating) {
            rating.textContent = `⭐ ${(movieData.vote_average || 0).toFixed(1)}/10`;
        }

        if (genre && movieData.genres) {
            const genreNames = movieData.genres.map(g => g.name).slice(0, 3).join(', ');
            genre.textContent = genreNames || 'Gêneros não informados';
        }

        if (synopsis) {
            synopsis.textContent = movieData.overview || 'Sinopse não disponível.';
        }
    }

    updateDetails(movieData) {
        const detailedSynopsis = document.getElementById("movieDetailedSynopsis");
        const duration = document.getElementById("movieDuration");
        const budget = document.getElementById("movieBudget");
        const revenue = document.getElementById("movieRevenue");
        const language = document.getElementById("movieLanguage");

        if (detailedSynopsis) {
            detailedSynopsis.textContent = movieData.overview || 'Descrição detalhada não disponível.';
        }

        if (duration) {
            duration.textContent = this.formatDuration(movieData.runtime);
        }

        if (budget) {
            budget.textContent = this.formatCurrency(movieData.budget);
        }

        if (revenue) {
            revenue.textContent = this.formatCurrency(movieData.revenue);
        }

        if (language) {
            language.textContent = this.getLanguageName(movieData.original_language);
        }
    }

    updateCast(creditsData) {
        const castGrid = document.getElementById("castGrid");
        if (!castGrid || !creditsData.cast) return;

        castGrid.innerHTML = '';

        const mainCast = creditsData.cast.slice(0, 6);
        
        mainCast.forEach(actor => {
            const actorElement = document.createElement("div");
            actorElement.className = "cast-member";
            
            const profileImage = actor.profile_path 
                ? `${API_CONFIG.profileUrl}${actor.profile_path}`
                : this.getPlaceholderImage();

            actorElement.innerHTML = `
                <img src="${profileImage}" alt="Foto de ${actor.name}" loading="lazy">
                <p>${actor.name}</p>
                <small>${actor.character || 'Personagem não informado'}</small>
            `;
            
            castGrid.appendChild(actorElement);
        });
    }

    updateTrailer(videosData) {
        const videoPlayer = document.getElementById("videoPlayer");
        if (!videoPlayer || !videosData.results) return;

        // Procurar por trailer em português ou inglês
        const trailer = videosData.results.find(video => 
            video.type === "Trailer" && video.site === "YouTube"
        ) || videosData.results.find(video => 
            video.site === "YouTube"
        );

        if (trailer) {
            videoPlayer.src = `https://www.youtube.com/embed/${trailer.key}?rel=0&modestbranding=1`;
        } else {
            const videoSection = document.querySelector('.video-section');
            if (videoSection) {
                videoSection.style.display = 'none';
            }
        }
    }

    getPlaceholderImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSIjMkQyRDVGIi8+CjxjaXJjbGUgY3g9Ijc1IiBjeT0iNjAiIHI9IjIwIiBmaWxsPSIjOEI1Q0Y2Ii8+CjxwYXRoIGQ9Ik0zMCAxMjBDMzAgMTA0IDUxIDkyIDc1IDkyUzEyMCAxMDQgMTIwIDEyMFYxMzBIMzBWMTIwWiIgZmlsbD0iIzhCNUNGNiIvPgo8L3N2Zz4=';
    }

    openStreamModal() {
        const streamModal = document.getElementById('streamModal');
        const streamWarning = document.getElementById('streamWarning');
        const streamFrame = document.getElementById('streamFrame');

        if (streamModal) {
            streamModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }

        if (streamWarning) {
            streamWarning.style.display = 'flex';
        }

        if (streamFrame) {
            streamFrame.style.display = 'none';
            streamFrame.src = '';
        }
    }

    proceedToWatch() {
        const streamWarning = document.getElementById('streamWarning');
        const streamFrame = document.getElementById('streamFrame');

        if (streamWarning) {
            streamWarning.style.display = 'none';
        }

        if (streamFrame && this.movieId) {
            streamFrame.style.display = 'block';
            streamFrame.src = `${API_CONFIG.streamUrl}${this.movieId}`;
            
            // Configurar atributos de segurança
            streamFrame.setAttribute('referrerpolicy', 'no-referrer');
            streamFrame.setAttribute('loading', 'lazy');
            
            // Timeout para detectar problemas de carregamento
            const loadTimeout = setTimeout(() => {
                this.showStreamError('Tempo limite excedido. Tente novamente.');
            }, 15000);

            streamFrame.onload = () => {
                clearTimeout(loadTimeout);
            };

            streamFrame.onerror = () => {
                clearTimeout(loadTimeout);
                this.showStreamError('Erro ao carregar o player. Verifique sua conexão.');
            };
        }
    }

    cancelStream() {
        const streamModal = document.getElementById('streamModal');
        const streamFrame = document.getElementById('streamFrame');

        if (streamModal) {
            streamModal.classList.remove('active');
        }

        if (streamFrame) {
            streamFrame.src = '';
        }

        document.body.style.overflow = 'auto';
    }

    showStreamError(message) {
        const streamFrame = document.getElementById('streamFrame');
        if (!streamFrame) return;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'stream-error';
        errorDiv.innerHTML = `
            <div style="
                position: absolute; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%);
                background: var(--bg-secondary); 
                padding: 2rem; 
                border-radius: 1rem; 
                text-align: center;
                border: 2px solid var(--accent-color); 
                color: white;
                max-width: 400px;
            ">
                <h3 style="color: var(--accent-color); margin-bottom: 1rem;">⚠️ Erro no Player</h3>
                <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">${message}</p>
                <button onclick="location.reload()" style="
                    background: var(--primary-gradient); 
                    color: white; 
                    border: none;
                    padding: 0.75rem 1.5rem; 
                    border-radius: 0.5rem; 
                    cursor: pointer;
                    font-weight: 600;
                ">
                    Recarregar Página
                </button>
            </div>
        `;

        streamFrame.style.display = 'none';
        streamFrame.parentNode.appendChild(errorDiv);
    }

    showError(message) {
        // Implementar exibição de erro na página
        const banner = document.getElementById("movieBanner");
        if (banner) {
            banner.innerHTML = `
                <div class="banner-overlay"></div>
                <div class="banner-content">
                    <div class="movie-header">
                        <h1 class="movie-title" style="color: var(--accent-color);">⚠️ Erro</h1>
                        <p class="movie-synopsis">${message}</p>
                        <div class="action-buttons">
                            <button class="play-button" onclick="location.reload()">
                                <span>Tentar Novamente</span>
                            </button>
                            <a href="index.html" class="info-button">
                                <span>Voltar ao Início</span>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

// ===== INICIALIZAÇÃO =====
let movieManager;

function initializeMoviePage() {
    movieManager = new MoviePageManager();
    movieManager.loadMovieDetails();
    
    console.log('🎬 Página de filme DreamCria inicializada!');
}

// Inicializar quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMoviePage);
} else {
    initializeMoviePage();
}

// Exportar para debugging
if (typeof window !== 'undefined') {
    window.DreamCriaMovie = {
        movieManager
    };
}
