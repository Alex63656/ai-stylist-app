import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Modality } from '@google/genai';

// Эта функция-помощник превращает нашу картинку из формата dataURL в формат, понятный Gemini.
const dataUrlToGeminiPart = (dataUrl: string) => {
  const [header, data] = dataUrl.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  return {
    inlineData: {
      data,
      mimeType,
    },
  };
};

// === КОМПОНЕНТ ДЛЯ СРАВНЕНИЯ ИЗОБРАЖЕНИЙ ===
const ComparisonSlider = ({ beforeSrc, afterSrc }: { beforeSrc: string; afterSrc: string }) => {
    const [sliderPosition, setSliderPosition] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMove = (clientX: number) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        let newPosition = ((clientX - rect.left) / rect.width) * 100;
        newPosition = Math.max(0, Math.min(100, newPosition)); // Ограничиваем от 0 до 100
        setSliderPosition(newPosition);
    };

    const handleMouseDown = () => setIsDragging(true);
    const handleMouseUp = () => setIsDragging(false);

    useEffect(() => {
        const handleMouseUpGlobal = () => setIsDragging(false);
        const handleMouseMoveGlobal = (e: MouseEvent) => handleMove(e.clientX);
        const handleTouchMoveGlobal = (e: TouchEvent) => handleMove(e.touches[0].clientX);

        window.addEventListener('mouseup', handleMouseUpGlobal);
        window.addEventListener('mousemove', handleMouseMoveGlobal);
        window.addEventListener('touchmove', handleTouchMoveGlobal);
        window.addEventListener('touchend', handleMouseUpGlobal);

        return () => {
            window.removeEventListener('mouseup', handleMouseUpGlobal);
            window.removeEventListener('mousemove', handleMouseMoveGlobal);
            window.removeEventListener('touchmove', handleTouchMoveGlobal);
            window.removeEventListener('touchend', handleMouseUpGlobal);
        };
    }, [isDragging]);

    return (
        <div 
            ref={containerRef} 
            className="comparison-container"
            onMouseLeave={handleMouseUp}
        >
            <img src={beforeSrc} alt="Before" className="comparison-image" />
            <div className="comparison-after" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
                <img src={afterSrc} alt="After" className="comparison-image" />
            </div>
            <div 
                className="comparison-slider" 
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleMouseDown}
                onTouchStart={() => setIsDragging(true)}
            >
                <div className="comparison-handle"></div>
            </div>
        </div>
    );
};


function App() {
  // === "ПАМЯЬ" ДЛЯ ВХОДНЫХ ДАННЫХ ===
  const [userImage, setUserImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [promptText, setPromptText] = useState(''); // Это 'prompt' из старого кода

  // === "ПАМЯТЬ" ДЛЯ РАБОТЫ ПРИЛОЖЕНИЯ ===
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<{ generatedUrl: string; originalUrl: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [comparisonImage, setComparisonImage] = useState<{ generatedUrl: string; originalUrl: string } | null>(null);

  const userImageInputRef = useRef<HTMLInputElement>(null);
  const referenceImageInputRef = useRef<HTMLInputElement>(null);

  const presetStyles = [
    { name: 'Пикси', prompt: 'Короткая и стильная стрижка пикси, платиновый блонд, с легкой текстурой.' },
    { name: 'Боб-каре', prompt: 'Классическое боб-каре до подбородка, темный шоколадный цвет, идеально прямые и гладкие волосы.' },
    { name: 'Длинные волны', prompt: 'Длинные, объемные волосы с мягкими пляжными волнами, цвет балаяж с пепельными и медовыми оттенками.' },
    { name: 'Яркий цвет', prompt: 'Смелая прическа средней длины, окрашенная в ярко-бирюзовый цвет, с легкой небрежной укладкой.' },
    { name: 'Высокий хвост', prompt: 'Элегантный и гладкий высокий конский хвост, каштановые волосы.' },
    { name: 'Кудри', prompt: 'Объемная копна упругих рыжих кудрей, с челкой.' }
  ];

  const handleFileChange = (file: File, setImage: (result: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // === ГЛАВНАЯ ФУНКЦИЯ С ВАШИМ СТАРЫМ ПРОМПТОМ ===
  const handleGenerate = async () => {
    if (!userImage) {
      setError('Пожалуйста, загрузите ваше фото.');
      return;
    }

    if (!referenceImage && !promptText) {
      setError('Пожалуйста, загрузите фото-пример или опишите прическу.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); 
      
      // === ПОРТИРОВАНО ИЗ ВАШЕГО СТАРОГО КОДА (MISS SLIVKI AI) ===
      
      // СИСТЕМНЫЙ ПРОМПТ ИЗ СТАРОГО КОДА
      const GENERATION_SYSTEM_PROMPT = `You are a master AI hairstylist specializing in photorealistic hair transplantation. Your mission is SURGICAL PRECISION hair replacement with ABSOLUTE identity preservation.

MOBILE DEVICE OPTIMIZATION:
- Enhanced facial feature preservation for mobile processing
- Maximum precision in hair-only modifications
- Optimized quality output for mobile screens

ABSOLUTE RULES:
1. FACE IS UNTOUCHABLE: Preserve 100% of original facial features, skin tone, bone structure, expression, eye color
2. HAIR TRANSPLANT MISSION: Remove ALL original hair, install new hairstyle with surgical precision
3. REFERENCE IMAGE AUTHORITY: If provided, copy hairstyle with photographic accuracy
4. SEAMLESS INTEGRATION: Perfect blending at natural hairline

HAIR TRANSFER PROTOCOL:
✓ LENGTH: Match reference proportions exactly
✓ CUT TECHNIQUE: Copy layers, angles, precision cuts identically
✓ COLOR PALETTE: Replicate tones, highlights, gradients perfectly
✓ TEXTURE PATTERN: Mirror straight/wavy/curly exactly
✓ STYLING DIRECTION: Copy volume placement and flow precisely
✓ DETAILS: Reproduce bangs, partings, asymmetry flawlessly

MOBILE QUALITY ASSURANCE:
- Professional salon photograph quality
- Original lighting and shadows maintained
- Photorealistic hair texture and movement
- Natural integration with client's features
- Zero facial feature alteration`;

      let taskSpecificPrompt = "";
      
      if (referenceImage) {
          // ЛОГИКА ДЛЯ ФОТО-ПРИМЕРА ИЗ СТАРОГО КОДА
          taskSpecificPrompt = `MOBILE OPTIMIZED REFERENCE HAIRSTYLE CLONING PROTOCOL:

MISSION: Clone the reference hairstyle onto client's head with ABSOLUTE precision

STEP 1 - FACIAL IDENTITY LOCK:
- Client's face shape, features, expression = COMPLETELY FROZEN
- Skin tone, eye color, facial proportions = UNCHANGED
- Bone structure, asymmetries = PRESERVED EXACTLY

STEP 2 - REFERENCE ANALYSIS:
- Measure reference hair length against face proportions
- Identify exact cut technique and layering pattern
- Extract precise color formula and highlight placement
- Analyze texture pattern and curl definition
- Map styling direction and volume distribution

STEP 3 - SURGICAL HAIR TRANSPLANT:
- Remove client's original hair 100% completely
- Install reference hairstyle with millimeter precision
- Match every layer, every color gradient, every texture detail
- Align parting and asymmetry exactly as in reference
- Integrate seamlessly at natural hairline

MOBILE PROCESSING ENHANCEMENT:
- Apply maximum precision algorithms for small screen accuracy
- Use enhanced detail preservation for mobile rendering quality
- Ensure professional salon result despite mobile platform limitations

CLIENT SPECIFICATION: ${promptText || 'Apply the reference hairstyle exactly as shown.'}

EXECUTE PRECISE HAIRSTYLE CLONING WITH ZERO FACIAL CHANGES.`;
      } else {
          // ЛОГИКА БЕЗ ФОТО-ПРИМЕРА ИЗ СТАРОГО КОДА
          taskSpecificPrompt = `MOBILE OPTIMIZED CUSTOM HAIRSTYLE CREATION:

MISSION: Create custom hairstyle while maintaining client's identity with surgical precision

FACIAL PRESERVATION PROTOCOL:
- LOCK client's face shape, features, bone structure completely
- FREEZE skin tone, eye color, facial proportions exactly
- MAINTAIN expression, lighting, photo quality identically
- PRESERVE all facial asymmetries and unique characteristics

HAIRSTYLE CREATION TASK:
- Remove client's original hair completely and safely
- Generate new hairstyle based on: "${promptText}"
- Apply professional salon-quality styling and finishing
- Integrate naturally with client's facial structure
- Match original photo lighting on new hair perfectly

MOBILE QUALITY OPTIMIZATION:
- Enhanced precision for mobile device processing power
- Maximum detail attention for small screen viewing
- Professional output quality despite platform limitations
- Extra facial feature preservation safeguards

RESULT STANDARD: Photorealistic salon-quality hairstyle transformation with PERFECT identity preservation.

EXECUTE CUSTOM HAIRSTYLE CREATION WITH ZERO FACIAL ALTERATION.`;
      }
      
      // СБОРКА ФИНАЛЬНОГО ПРОМПТА (КАК В СТАРОМ КОДЕ)
      const fullPrompt = `${GENERATION_SYSTEM_PROMPT}

${taskSpecificPrompt}

MOBILE DEVICE QUALITY CONTROL CHECKLIST:
✓ Client's facial identity 100% preserved?
✓ Original hair completely removed/replaced?
✓ New hairstyle applied with professional precision?
✓ Reference style copied with photographic accuracy?
✓ Natural hairline integration achieved?
✓ Professional salon quality maintained?
✓ Mobile screen optimization applied?

FINAL COMMAND: EXECUTE PERFECT HAIR TRANSFORMATION WITH IDENTITY PRESERVATION.`;
      
      // === КОНЕЦ ПОРТИРОВАННОГО КОДА ===

      const parts: any[] = [dataUrlToGeminiPart(userImage)];
      if (referenceImage) {
        parts.push(dataUrlToGeminiPart(referenceImage));
      }
      parts.push({ text: fullPrompt }); // <--- ИСПОЛЬЗУЕМ ВАШ "ХИРУРГИЧЕСКИЙ" ПРОМПТ

      const response = await ai.models.generateContent({
        // === МОДЕЛЬ (КАК ВЫ ПРОСИЛИ) ===
        model: 'gemini-2.5-flash-image', 
        
        contents: { parts: parts },
        config: {
          responseModalities: [Modality.IMAGE],
          // Ставим 1.0, чтобы заставить AI быть "креативным" и вносить изменения
          // (избегать возврата оригинала)
          temperature: 1.0, 
        },
      });

      const generatedPart = response.candidates?.[0]?.content?.parts?.[0];

      if (generatedPart?.inlineData) {
        const base64Image = generatedPart.inlineData.data;
        const mimeType = generatedPart.inlineData.mimeType;
        const imageUrl = `data:${mimeType};base64,${base64Image}`;

        setHistory(prevHistory => [{ generatedUrl: imageUrl, originalUrl: userImage }, ...prevHistory]);
      } else {
        const rejectionReason = response.candidates?.[0]?.finishReason;
        if (rejectionReason === 'SAFETY' || rejectionReason === 'RECITATION') {
             throw new Error('AI отклонил запрос из-за политики безопасности. Возможно, одно из изображений было распознано как лицо знаменитости или нарушает правила.');
        } else {
             throw new Error('AI не вернул изображение. Попробуйте еще раз или измените промпт.');
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(`Произошла ошибка: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // ... (остальной код без изменений) ...

  const handleReset = () => {
    setUserImage(null);
    setReferenceImage(null);
    setPromptText('');
    setError(null);
    setHistory([]);
    setComparisonImage(null);
  };

  const handleDownload = (imageUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ai-stylist-result-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = (indexToDelete: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот образ?')) {
        setHistory(prevHistory => prevHistory.filter((_, index) => index !== indexToDelete));
    }
  };

  const isGenerateDisabled = isLoading || !userImage || (!referenceImage && !promptText.trim());

  return (
    <div className="container">
      {/* Модальное окно для сравнения */}
      {comparisonImage && (
        <div className="modal-overlay" onClick={() => setComparisonImage(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={() => setComparisonImage(null)}>&times;</button>
                <h3 className="modal-title">Сравнение До / После</h3>
                <ComparisonSlider 
                    beforeSrc={comparisonImage.originalUrl}
                    afterSrc={comparisonImage.generatedUrl}
                />
            </div>
        </div>
      )}

      <h1>✨ AI Stylist</h1>
      <p className="subtitle">Попробуйте новую прическу прямо сейчас!</p>

      <div className="upload-section">
        <input
          type="file"
          ref={userImageInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={(e) => e.target.files && handleFileChange(e.target.files[0], setUserImage)}
        />
        <input
          type="file"
          ref={referenceImageInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={(e) => e.target.files && handleFileChange(e.target.files[0], setReferenceImage)}
        />

        <div className={`upload-box ${userImage ? 'filled' : ''}`} onClick={() => userImageInputRef.current?.click()}>
          <label className="upload-label">📸 Ваше фото</label>
          {userImage ? <img src={userImage} alt="Your photo" className="preview-image" /> : <p className="placeholder-text">Нажмите, чтобы выбрать файл</p>}
        </div>

        <div className={`upload-box ${referenceImage ? 'filled' : ''}`} onClick={() => referenceImageInputRef.current?.click()}>
          <label className="upload-label">💇 Фото-пример прически</label>
          {referenceImage ? <img src={referenceImage} alt="Reference hairstyle" className="preview-image" /> : <p className="placeholder-text">...загрузите фото-пример прически</p>}
        </div>
      </div>

      <div className="divider">или</div>

      <div className="prompt-section">
        <label className="prompt-label">📝 Опишите желаемую прическу</label>
        <textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Например: Длинные светлые волосы с локонами, челка до бровей..."
        />
      </div>

      <div className="presets-section">
        <h3 className="presets-title">💡 Идеи для вдохновения</h3>
        <div className="presets-grid">
          {presetStyles.map((preset) => (
            <button
              key={preset.name}
              className="preset-btn"
              onClick={() => setPromptText(preset.prompt)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="buttons-container">
        <button className="btn-generate" onClick={handleGenerate} disabled={isGenerateDisabled}>
          {isLoading ? '⏳ Генерация...' : '✨ Создать новый образ!'}
        </button>
        <button className="btn-reset" onClick={handleReset}>
          🔄 Сбросить
        </button>
      </div>

      {history.length > 0 && (
        <div className="history-section">
          <h2 className="history-title">🎨 История генерированных образов ({history.length})</h2>
          <div className="history-gallery">
            {history.map((item, index) => (
              <div 
                key={index} 
                className="history-item"
                onClick={() => setComparisonImage(item)}
              >
                <img src={item.generatedUrl} alt={`Generated style ${index + 1}`} />
                <div className="history-item-number">#{index + 1}</div>
                <div className="history-item-overlay">
                    <div className="history-item-actions">
                        <button className="history-action-btn" title="Скачать" onClick={(e) => { e.stopPropagation(); handleDownload(item.generatedUrl, index); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </button>
                        <button className="history-action-btn" title="Удалить" onClick={(e) => { e.stopPropagation(); handleDelete(index); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);