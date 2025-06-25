import React, { useState, useEffect } from 'react';
import { StudioElement } from '../../types/draft';
import { getImageFromDb } from '../../services/imageDb'; // Импортируем функцию для получения изображения

interface BackgroundImageElementProps {
  element: StudioElement;
  isBroadcast?: boolean;
  isSelected?: boolean;
}

const BackgroundImageElement: React.FC<BackgroundImageElementProps> = ({ element, isBroadcast, isSelected }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { imageUrl: imageKey, opacity, stretch } = element; // imageUrl теперь imageKey

  useEffect(() => {
    // Предыдущий objectUrl нужно освободить перед загрузкой нового
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null); // Сброс, чтобы избежать мерцания старого изображения
    }

    if (imageKey && typeof imageKey === 'string' && imageKey.startsWith('bg-')) {
      setIsLoading(true);
      setError(null);
      console.log(`[BackgroundImageElement] Attempting to load image from DB for key: ${imageKey}`);
      getImageFromDb(imageKey)
        .then(file => {
          if (file) {
            const newObjectUrl = URL.createObjectURL(file);
            setObjectUrl(newObjectUrl);
            console.log(`[BackgroundImageElement] Image loaded from DB for key: ${imageKey}, object URL created: ${newObjectUrl.substring(0,50)}...`);
          } else {
            console.warn(`[BackgroundImageElement] Image not found in DB for key: ${imageKey}`);
            setError('Image not found in local DB.');
            setObjectUrl(null);
          }
        })
        .catch(err => {
          console.error(`[BackgroundImageElement] Error loading image from DB for key: ${imageKey}`, err);
          setError('Error loading image.');
          setObjectUrl(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (imageKey && typeof imageKey === 'string' && imageKey.startsWith('data:')) {
        // Обработка старых data:URL, если они еще есть (для обратной совместимости на время перехода)
        // Это не будет работать долгосрочно, т.к. partialize теперь их не сохраняет,
        // но если они есть в localStorage от предыдущих версий.
        console.log(`[BackgroundImageElement] Using direct data:URL for image key (likely old format): ${imageKey.substring(0,50)}...`);
        setObjectUrl(imageKey);
        setIsLoading(false);
        setError(null);
    } else {
      console.log(`[BackgroundImageElement] No valid image key provided for element ${element.id}. Key: ${imageKey}`);
      setObjectUrl(null);
      setIsLoading(false);
      setError(imageKey ? 'Invalid image key.' : null); // Ошибка если ключ есть, но невалидный
    }

    // Очистка object URL при размонтировании компонента
    return () => {
      if (objectUrl) {
        console.log(`[BackgroundImageElement] Revoking object URL on unmount: ${objectUrl.substring(0,50)}... for key: ${imageKey}`);
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageKey]); // Перезапускаем эффект при изменении imageKey

  // console.log(`[COMPONENT DEBUG] BackgroundImageElement rendering. Element ID: ${element.id}, Image Key (element.imageUrl): ${imageKey}, Current Object URL: ${objectUrl}, isLoading: ${isLoading}`);

  if (element.type !== 'BackgroundImage') {
    return null;
  }

  const commonStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
  };

  if (isLoading) {
    return (
      <div style={{
        ...commonStyle,
        border: (!isBroadcast && isSelected) ? '2px dashed #007bff' : '1px dashed #555',
        backgroundColor: 'rgba(0,0,0,0.1)', color: '#888', fontSize: '0.9em',
      }}>
        Loading background...
      </div>
    );
  }

  if (error) {
    if (!isBroadcast) { // Показываем ошибку только в студии
      return (
        <div style={{
          ...commonStyle,
          border: (!isBroadcast && isSelected) ? '2px dashed #cc0000' : '1px dashed #770000',
          backgroundColor: 'rgba(255,0,0,0.05)', color: '#cc0000', fontSize: '0.9em',
        }}>
          Error: {error} (ID: {element.id})
        </div>
      );
    }
    return null; // Не рендерим ошибку в broadcast view
  }

  if (!objectUrl) { // Если нет ключа или файл не загрузился, но нет явной ошибки
    if (!isBroadcast) {
      return (
        <div style={{
          ...commonStyle,
          border: isSelected ? '2px dashed #007bff' : '1px dashed #555',
          backgroundColor: 'rgba(255,255,255,0.05)', color: '#777', fontSize: '1em',
        }}>
          Background Image: Not set or unavailable
        </div>
      );
    }
    return null; // Не рендерим ничего в broadcast если нет URL
  }

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: stretch || 'cover',
    opacity: opacity === undefined ? 1 : opacity,
  };

  return (
    <div
      style={{
        ...commonStyle,
        border: (!isBroadcast && isSelected) ? '2px dashed #007bff' : 'none',
        // overflow: 'hidden', // Добавим, чтобы изображение не вылезало за рамки при некоторых objectFit
      }}
    >
      <img
        src={objectUrl}
        alt="" // Пустой alt, так как это декоративное изображение
        style={imgStyle}
        draggable="false"
      />
    </div>
  );
};

export default BackgroundImageElement;
