// functions.js

// Global variables
let currentData = [];
let platformConnections = {
    instagram: false,
    facebook: false,
    tiktok: false
};

// Default configuration
const defaultConfig = {
    app_title: "Social Media Auto Uploader",
    welcome_message: "Kelola dan upload konten ke media sosial secara otomatis"
};

// Data handler for SDK
const dataHandler = {
    onDataChanged(data) {
        currentData = data;
        updateDashboardStats();
        updateRecentUploads();
        updateUploadHistory();
    }
};

// Element SDK configuration
const elementConfig = {
    defaultConfig: defaultConfig,
    onConfigChange: async (config) => {
        const appTitle = config.app_title || defaultConfig.app_title;
        const welcomeMessage = config.welcome_message || defaultConfig.welcome_message;
        
        document.getElementById('app-title').textContent = appTitle;
        document.getElementById('welcome-message').textContent = welcomeMessage;
    },
    mapToCapabilities: (config) => ({
        recolorables: [],
        borderables: [],
        fontEditable: undefined,
        fontSizeable: undefined
    }),
    mapToEditPanelValues: (config) => new Map([
        ["app_title", config.app_title || defaultConfig.app_title],
        ["welcome_message", config.welcome_message || defaultConfig.welcome_message]
    ])
};

// Initialize the application and SDKs
async function initializeApp() {
    try {
        // Initialize Element SDK
        if (window.elementSdk) {
            await window.elementSdk.init(elementConfig);
        }

        // Initialize Data SDK
        if (window.dataSdk) {
            const result = await window.dataSdk.init(dataHandler);
            if (!result.isOk) {
                console.error("Failed to initialize data SDK");
            }
        }

        // Set initial active navigation
        showSection('dashboard');
    } catch (error) {
        console.error("Failed to initialize app:", error);
    }
}

// Convert Google Drive sharing URL to direct image URL
function convertGoogleDriveUrl() {
    const input = document.getElementById('image-url');
    const originalUrl = input.value.trim();
    
    if (!originalUrl) {
        showToast('Masukkan URL Google Drive terlebih dahulu', 'error');
        return;
    }

    // Extract file ID from Google Drive URL
    let fileId = '';
    
    // Pattern 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    const pattern1 = /\/file\/d\/([a-zA-Z0-9-_]+)/;
    const match1 = originalUrl.match(pattern1);
    
    // Pattern 2: https://drive.google.com/open?id=FILE_ID
    const pattern2 = /[?&]id=([a-zA-Z0-9-_]+)/;
    const match2 = originalUrl.match(pattern2);
    
    if (match1) {
        fileId = match1[1];
    } else if (match2) {
        fileId = match2[1];
    } else {
        showToast('Format URL Google Drive tidak valid. Pastikan URL dapat diakses publik.', 'error');
        return;
    }

    // Convert to direct image URL
    const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    input.value = directUrl;
    
    showToast('URL berhasil dikonversi! Preview akan muncul jika gambar dapat diakses.', 'success');
    
    // Trigger preview update
    updateImagePreview(directUrl);
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    const sections = ['dashboard', 'upload', 'connections', 'history', 'analytics'];
    sections.forEach(section => {
        document.getElementById(`${section}-section`).classList.add('hidden');
        document.getElementById(`nav-${section}`).classList.remove('bg-blue-800', 'text-white');
        document.getElementById(`nav-${section}`).classList.add('text-blue-100');
    });

    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.remove('hidden');
    document.getElementById(`nav-${sectionName}`).classList.add('bg-blue-800', 'text-white');
    document.getElementById(`nav-${sectionName}`).classList.remove('text-blue-100');
    
    // Update analytics when analytics section is shown
    if (sectionName === 'analytics') {
        updateAnalytics();
    }
}

// Dashboard functions
function updateDashboardStats() {
    const total = currentData.length;
    const success = currentData.filter(item => item.status === 'success').length;
    const pending = currentData.filter(item => item.status === 'pending').length;
    const failed = currentData.filter(item => item.status === 'failed').length;

    document.getElementById('total-uploads').textContent = total;
    document.getElementById('success-uploads').textContent = success;
    document.getElementById('pending-uploads').textContent = pending;
    document.getElementById('failed-uploads').textContent = failed;
}

function updateRecentUploads() {
    const recentContainer = document.getElementById('recent-uploads');
    const recentUploads = currentData.slice(-5).reverse();

    if (recentUploads.length === 0) {
        recentContainer.innerHTML = '<p class="text-gray-500 text-center py-8">Belum ada upload yang dilakukan</p>';
        return;
    }

    const html = recentUploads.map(upload => `
        <div class="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
            <div class="flex items-center">
                <img src="${upload.image_url}" alt="Preview" class="w-12 h-12 object-cover rounded-lg mr-4" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCA0OCA0OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjggOEgxMmE0IDQgMCAwMC00IDR2MjBtMzItMTJ2OG0wIDB2OGE0IDQgMCAwMS00IDRIMTJhNCA0IDAgMDEtNC00di00bTMyLTRsLTMuMTcyLTMuMTcyYTQgNCAwIDAwLTUuNjU2IDBMMjggMjhNOCAzMmw5LjE3Mi05LjE3MmE0IDQgMCAwMTUuNjU2IDBMMjggMjhtMCAwbDQgNG00LTI0aDhtLTQtNHY4bS0xMiA0aC4wMiIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg=='; this.alt='Image failed to load';">
                <div>
                    <p class="font-medium text-gray-900">${upload.caption.substring(0, 50)}${upload.caption.length > 50 ? '...' : ''}</p>
                    <p class="text-sm text-gray-500">${upload.platforms}</p>
                </div>
            </div>
            <div class="text-right">
                <span class="status-${upload.status} font-medium text-sm">${getStatusText(upload.status)}</span>
                <p class="text-xs text-gray-500">${formatDate(upload.created_at)}</p>
            </div>
        </div>
    `).join('');

    recentContainer.innerHTML = html;
}

// Upload functions
function setupUploadForm() {
    const form = document.getElementById('upload-form');
    const imageUrlInput = document.getElementById('image-url');
    const captionInput = document.getElementById('caption');

    // Image preview
    imageUrlInput.addEventListener('input', function() {
        const url = this.value.trim();
        if (url) {
            updateImagePreview(url);
        } else {
            hideImagePreview();
        }
    });

    // Caption preview
    captionInput.addEventListener('input', function() {
        const caption = this.value.trim();
        document.getElementById('preview-caption').textContent = caption;
    });

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await handleUpload();
    });
}

function updateImagePreview(url) {
    const previewImg = document.getElementById('preview-img');
    const imagePreview = document.getElementById('image-preview');
    const noPreview = document.getElementById('no-preview');

    previewImg.src = url;
    previewImg.onload = function() {
        imagePreview.classList.remove('hidden');
        noPreview.classList.add('hidden');
    };
    previewImg.onerror = function() {
        hideImagePreview();
        showToast('URL gambar tidak valid atau tidak dapat diakses', 'error');
    };
}

function hideImagePreview() {
    document.getElementById('image-preview').classList.add('hidden');
    document.getElementById('no-preview').classList.remove('hidden');
}

async function handleUpload() {
    if (currentData.length >= 999) {
        showToast('Maksimum 999 upload telah tercapai. Hapus beberapa item terlebih dahulu.', 'error');
        return;
    }

    const imageUrl = document.getElementById('image-url').value.trim();
    const caption = document.getElementById('caption').value.trim();
    const selectedPlatforms = Array.from(document.querySelectorAll('input[name="platforms"]:checked'))
        .map(cb => cb.value);

    // Validation
    if (!imageUrl) {
        showToast('URL gambar harus diisi', 'error');
        return;
    }

    if (!caption) {
        showToast('Caption harus diisi', 'error');
        return;
    }

    if (selectedPlatforms.length === 0) {
        showToast('Pilih minimal satu platform media sosial', 'error');
        return;
    }

    // Check platform connections
    const unconnectedPlatforms = selectedPlatforms.filter(platform => !platformConnections[platform]);
    if (unconnectedPlatforms.length > 0) {
        showToast(`Platform ${unconnectedPlatforms.join(', ')} belum terhubung`, 'error');
        return;
    }

    // Show loading state
    setUploadLoading(true);

    try {
        const uploadData = {
            id: generateId(),
            image_url: imageUrl,
            caption: caption,
            platforms: selectedPlatforms.join(', '),
            status: 'pending',
            scheduled_time: new Date().toISOString(),
            created_at: new Date().toISOString(),
            uploaded_at: ''
        };

        const result = await window.dataSdk.create(uploadData);

        if (result.isOk) {
            showToast('Upload berhasil dijadwalkan!', 'success');
            resetForm();
            
            // Simulate upload process
            setTimeout(() => simulateUploadProcess(uploadData.id), 2000);
        } else {
            showToast('Gagal menyimpan data upload', 'error');
        }
    } catch (error) {
        showToast('Terjadi kesalahan saat upload', 'error');
    } finally {
        setUploadLoading(false);
    }
}

function simulateUploadProcess(uploadId) {
    // Find the upload in current data
    const upload = currentData.find(item => item.id === uploadId);
    if (!upload) return;

    // Update status to uploading
    upload.status = 'uploading';
    window.dataSdk.update(upload);

    // Simulate upload completion after 3-5 seconds
    setTimeout(async () => {
        const success = Math.random() > 0.2; // 80% success rate
        upload.status = success ? 'success' : 'failed';
        upload.uploaded_at = success ? new Date().toISOString() : '';
        
        const result = await window.dataSdk.update(upload);
        if (result.isOk) {
            showToast(
                success ? 'Upload berhasil ke media sosial!' : 'Upload gagal, silakan coba lagi',
                success ? 'success' : 'error'
            );
        }
    }, Math.random() * 3000 + 2000);
}

function setUploadLoading(loading) {
    const btn = document.getElementById('upload-btn');
    const btnText = document.getElementById('upload-btn-text');
    const loadingSpinner = document.getElementById('upload-loading');

    if (loading) {
        btn.disabled = true;
        btn.classList.add('opacity-75');
        btnText.textContent = 'Mengupload...';
        loadingSpinner.classList.remove('hidden');
    } else {
        btn.disabled = false;
        btn.classList.remove('opacity-75');
        btnText.textContent = 'Upload Sekarang';
        loadingSpinner.classList.add('hidden');
    }
}

function resetForm() {
    document.getElementById('upload-form').reset();
    hideImagePreview();
    document.getElementById('preview-caption').textContent = '';
}

// Platform connection functions
function connectPlatform(platform) {
    // Simulate connection process
    showToast(`Menghubungkan ke ${platform.charAt(0).toUpperCase() + platform.slice(1)}...`, 'info');
    
    setTimeout(() => {
        platformConnections[platform] = true;
        updatePlatformStatus(platform, true);
        showToast(`Berhasil terhubung ke ${platform.charAt(0).toUpperCase() + platform.slice(1)}!`, 'success');
    }, 2000);
}

function updatePlatformStatus(platform, connected) {
    const statusElements = [
        document.getElementById(`${platform}-status`),
        document.getElementById(`${platform}-connection-status`)
    ];

    const buttonElement = document.getElementById(`${platform}-connect-btn`);

    statusElements.forEach(element => {
        if (element) {
            element.textContent = connected ? 'Terhubung' : 'Tidak Terhubung';
            element.className = connected 
                ? 'ml-2 text-xs px-2 py-1 rounded-full bg-green-100 text-green-600'
                : 'ml-2 text-xs px-2 py-1 rounded-full bg-red-100 text-red-600';
        }
    });

    if (buttonElement) {
        buttonElement.textContent = connected 
            ? `Putuskan ${platform.charAt(0).toUpperCase() + platform.slice(1)}`
            : `Hubungkan ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;
        
        if (connected) {
            buttonElement.onclick = () => disconnectPlatform(platform);
        } else {
            buttonElement.onclick = () => connectPlatform(platform);
        }
    }
}

function disconnectPlatform(platform) {
    platformConnections[platform] = false;
    updatePlatformStatus(platform, false);
    showToast(`Terputus dari ${platform.charAt(0).toUpperCase() + platform.slice(1)}`, 'info');
}

// History functions
function updateUploadHistory() {
    const historyContainer = document.getElementById('upload-history');
    
    if (currentData.length === 0) {
        historyContainer.innerHTML = '<div class="p-8 text-center text-gray-500">Belum ada riwayat upload</div>';
        return;
    }

    const sortedData = [...currentData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const html = sortedData.map(upload => `
        <div class="p-6 hover:bg-gray-50 transition-colors">
            <div class="flex items-start justify-between">
                <div class="flex items-start space-x-4">
                    <img src="${upload.image_url}" alt="Upload" class="w-16 h-16 object-cover rounded-lg" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCA0OCA0OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjggOEgxMmE0IDQgMCAwMC00IDR2MjBtMzItMTJ2OG0wIDB2OGE0IDQgMCAwMS00IDRIMTJhNCA0IDAgMDEtNC00di00bTMyLTRsLTMuMTcyLTMuMTcyYTQgNCAwIDAwLTUuNjU2IDBMMjggMjhNOCAzMmw5LjE3Mi05LjE3MmE0IDQgMCAwMTUuNjU2IDBMMjggMjhtMCAwbDQgNG00LTI0aDhtLTQtNHY4bS0xMiA0aC4wMiIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg=='; this.alt='Image failed to load';">
                    <div class="flex-1">
                        <p class="font-medium text-gray-900 mb-1">${upload.caption}</p>
                        <p class="text-sm text-gray-600 mb-2">Platform: ${upload.platforms}</p>
                        <p class="text-xs text-gray-500">Dibuat: ${formatDate(upload.created_at)}</p>
                        ${upload.uploaded_at ? `<p class="text-xs text-gray-500">Diupload: ${formatDate(upload.uploaded_at)}</p>` : ''}
                    </div>
                </div>
                <div class="text-right">
                    <span class="status-${upload.status} font-medium text-sm px-3 py-1 rounded-full bg-gray-100">
                        ${getStatusText(upload.status)}
                    </span>
                    <button onclick="deleteUpload('${upload.id}')" class="ml-2 text-red-600 hover:text-red-700 text-sm">
                        Hapus
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    historyContainer.innerHTML = html;
}

/**
 * Delete upload record
 * @param {string} uploadId - ID of upload to delete
 */
async function deleteUpload(uploadId) {
    const upload = currentData.find(item => item.id === uploadId);
    if (!upload) return;

    const result = await window.dataSdk.delete(upload);
    if (result.isOk) {
        showToast('Upload berhasil dihapus', 'success');
    } else {
        showToast('Gagal menghapus upload', 'error');
    }
}

/**
 * Refresh upload history
 */
function refreshHistory() {
    showToast('Riwayat diperbarui', 'info');
    updateUploadHistory();
}

/**
 * Update all analytics data
 */
function updateAnalytics() {
    updateStatusAnalytics();
    updatePlatformAnalytics();
    updateDetailedAnalytics();
    updateUploadTimeline();
    updateContentPerformance();
}

/**
 * Update status analytics
 */
function updateStatusAnalytics() {
    const total = currentData.length;
    const success = currentData.filter(item => item.status === 'success').length;
    const pending = currentData.filter(item => item.status === 'pending').length;
    const uploading = currentData.filter(item => item.status === 'uploading').length;
    const failed = currentData.filter(item => item.status === 'failed').length;

    // Update counts and percentages
    document.getElementById('analytics-success-count').textContent = success;
    document.getElementById('analytics-success-percent').textContent = `(${total > 0 ? Math.round((success / total) * 100) : 0}%)`;
    
    document.getElementById('analytics-pending-count').textContent = pending;
    document.getElementById('analytics-pending-percent').textContent = `(${total > 0 ? Math.round((pending / total) * 100) : 0}%)`;
    
    document.getElementById('analytics-uploading-count').textContent = uploading;
    document.getElementById('analytics-uploading-percent').textContent = `(${total > 0 ? Math.round((uploading / total) * 100) : 0}%)`;
    
    document.getElementById('analytics-failed-count').textContent = failed;
    document.getElementById('analytics-failed-percent').textContent = `(${total > 0 ? Math.round((failed / total) * 100) : 0}%)`;
}

/**
 * Update platform analytics
 */
function updatePlatformAnalytics() {
    const platformStats = {};
    
    currentData.forEach(upload => {
        const platforms = upload.platforms.split(', ');
        platforms.forEach(platform => {
            if (!platformStats[platform]) {
                platformStats[platform] = { total: 0, success: 0 };
            }
            platformStats[platform].total++;
            if (upload.status === 'success') {
                platformStats[platform].success++;
            }
        });
    });

    const container = document.getElementById('platform-analytics');
    
    if (Object.keys(platformStats).length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada data platform</p>';
        return;
    }

    const html = Object.entries(platformStats).map(([platform, stats]) => {
        const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
        const platformColors = {
            'instagram': 'bg-gradient-to-r from-purple-500 to-pink-500',
            'facebook': 'bg-blue-600',
            'tiktok': 'bg-black'
        };
        
        return `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <div class="w-4 h-4 ${platformColors[platform] || 'bg-gray-500'} rounded-full mr-3"></div>
                    <span class="text-gray-700 capitalize">${platform}</span>
                </div>
                <div class="text-right">
                    <span class="font-semibold text-gray-900">${stats.total}</span>
                    <span class="text-sm text-gray-500 ml-1">(${successRate}% berhasil)</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

/**
 * Update detailed analytics
 */
function updateDetailedAnalytics() {
    const total = currentData.length;
    const success = currentData.filter(item => item.status === 'success').length;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    
    document.getElementById('success-rate').textContent = `${successRate}%`;

    // Calculate average upload time (simulated)
    const completedUploads = currentData.filter(item => item.status === 'success' && item.uploaded_at);
    let avgTime = 0;
    
    if (completedUploads.length > 0) {
        const totalTime = completedUploads.reduce((sum, upload) => {
            const start = new Date(upload.created_at);
            const end = new Date(upload.uploaded_at);
            return sum + (end - start);
        }, 0);
        avgTime = Math.round(totalTime / completedUploads.length / 1000); // Convert to seconds
    }
    
    document.getElementById('avg-upload-time').textContent = `${avgTime}s`;

    // Find most active platform
    const platformCounts = {};
    currentData.forEach(upload => {
        const platforms = upload.platforms.split(', ');
        platforms.forEach(platform => {
            platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        });
    });

    const mostActive = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];
    if (mostActive) {
        document.getElementById('most-active-platform').textContent = mostActive[0].charAt(0).toUpperCase() + mostActive[0].slice(1);
        document.getElementById('most-active-count').textContent = `${mostActive[1]} upload`;
    } else {
        document.getElementById('most-active-platform').textContent = '-';
        document.getElementById('most-active-count').textContent = '0 upload';
    }
}

/**
 * Update upload timeline chart
 */
function updateUploadTimeline() {
    const container = document.getElementById('upload-timeline');
    const last7Days = [];
    
    // Generate last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        last7Days.push({
            date: date,
            dateStr: date.toLocaleDateString('id-ID', { weekday: 'short', month: 'short', day: 'numeric' }),
            uploads: 0,
            success: 0
        });
    }

    // Count uploads per day
    currentData.forEach(upload => {
        const uploadDate = new Date(upload.created_at);
        const dayIndex = last7Days.findIndex(day => 
            day.date.toDateString() === uploadDate.toDateString()
        );
        
        if (dayIndex !== -1) {
            last7Days[dayIndex].uploads++;
            if (upload.status === 'success') {
                last7Days[dayIndex].success++;
            }
        }
    });

    const maxUploads = Math.max(...last7Days.map(day => day.uploads), 1);
    
    const html = last7Days.map(day => {
        const percentage = (day.uploads / maxUploads) * 100;
        return `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <span class="text-sm text-gray-600 w-20">${day.dateStr}</span>
                    <div class="flex-1 bg-gray-200 rounded-full h-2 w-32">
                        <div class="bg-blue-600 h-2 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-sm font-medium text-gray-900">${day.uploads}</span>
                    <span class="text-xs text-gray-500 ml-1">(${day.success} berhasil)</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html || '<p class="text-gray-500 text-center py-4">Belum ada data timeline</p>';
}

/**
 * Update content performance list
 */
function updateContentPerformance() {
    const container = document.getElementById('content-performance');
    const filter = document.getElementById('performance-filter').value;
    
    let filteredData = currentData;
    if (filter !== 'all') {
        filteredData = currentData.filter(item => item.status === filter);
    }

    if (filteredData.length === 0) {
        container.innerHTML = '<div class="p-8 text-center text-gray-500">Tidak ada data untuk filter yang dipilih</div>';
        return;
    }

    const sortedData = [...filteredData].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const html = sortedData.map(upload => `
        <div class="p-4 hover:bg-gray-50 transition-colors">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <img src="${upload.image_url}" alt="Content" class="w-12 h-12 object-cover rounded-lg" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCA0OCA0OCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjggOEgxMmE0IDQgMCAwMC00IDR2MjBtMzItMTJ2OG0wIDB2OGE0IDQgMCAwMS00IDRIMTJhNCA0IDAgMDEtNC00di00bTMyLTRsLTMuMTcyLTMuMTcyYTQgNCAwIDAwLTUuNjU2IDBMMjggMjhNOCAzMmw5LjE3Mi05LjE3MmE0IDQgMCAwMTUuNjU2IDBMMjggMjhtMCAwbDQgNG00LTI0aDhtLTQtNHY4bS0xMiA0aC4wMiIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg=='; this.alt='Image failed to load';">
                    <div>
                        <p class="font-medium text-gray-900 text-sm">${upload.caption.substring(0, 60)}${upload.caption.length > 60 ? '...' : ''}</p>
                        <p class="text-xs text-gray-500">${upload.platforms} • ${formatDate(upload.created_at)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="status-${upload.status} font-medium text-xs px-2 py-1 rounded-full bg-gray-100">
                        ${getStatusText(upload.status)}
                    </span>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Format date to Indonesian locale
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Get status text in Indonesian
 * @param {string} status - Status code
 * @returns {string} Status text
 */
function getStatusText(status) {
    const statusMap = {
        'pending': 'Menunggu',
        'uploading': 'Mengupload',
        'success': 'Berhasil',
        'failed': 'Gagal'
    };
    return statusMap[status] || status;
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type (info, success, error)
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// ===== EVENT LISTENERS =====

/**
 * Initialize app when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupUploadForm();
    
    // Initialize platform status
    Object.keys(platformConnections).forEach(platform => {
        updatePlatformStatus(platform, platformConnections[platform]);
    });

    // Setup performance filter
    document.getElementById('performance-filter').addEventListener('change', updateContentPerformance);
});