// Объект для работы с собственным редактором
const CustomEditor = {
    // Инициализация редактора
    init: function(targetSelector) {
        // Находим все целевые элементы для редактора
        const targets = document.querySelectorAll(targetSelector);
        
        targets.forEach(target => {
            // Создаем контейнер для редактора
            this.createEditor(target);
        });
    },
    
    // Создание редактора для определенного элемента
    createEditor: function(targetElement) {
        // Создаем контейнер для редактора
        const editorContainer = document.createElement('div');
        editorContainer.className = 'custom-editor-container';
        
        // Создаем панель инструментов
        const toolbar = document.createElement('div');
        toolbar.className = 'editor-toolbar';
        
        // Добавляем кнопки форматирования
        toolbar.innerHTML = `
            <div class="editor-toolbar-group">
                <button type="button" data-command="undo" title="Отменить"><i class="fas fa-undo"></i></button>
                <button type="button" data-command="redo" title="Повторить"><i class="fas fa-redo"></i></button>
            </div>
            <div class="editor-toolbar-group">
                <select class="format-select" data-command="formatBlock" title="Формат текста">
                    <option value="p">Абзац</option>
                    <option value="h1">Заголовок 1</option>
                    <option value="h2">Заголовок 2</option>
                    <option value="h3">Заголовок 3</option>
                    <option value="h4">Заголовок 4</option>
                    <option value="blockquote">Цитата</option>
                    <option value="pre">Код</option>
                </select>
            </div>
            <div class="editor-toolbar-group">
                <button type="button" data-command="bold" title="Жирный"><i class="fas fa-bold"></i></button>
                <button type="button" data-command="italic" title="Курсив"><i class="fas fa-italic"></i></button>
                <button type="button" data-command="underline" title="Подчёркнутый"><i class="fas fa-underline"></i></button>
                <button type="button" data-command="strikeThrough" title="Зачёркнутый"><i class="fas fa-strikethrough"></i></button>
            </div>
            <div class="editor-toolbar-group">
                <select class="font-size-select" data-command="fontSize" title="Размер шрифта">
                    <option value="1">8pt</option>
                    <option value="2">10pt</option>
                    <option value="3" selected>12pt</option>
                    <option value="4">14pt</option>
                    <option value="5">18pt</option>
                    <option value="6">24pt</option>
                    <option value="7">36pt</option>
                </select>
                <input type="color" data-command="foreColor" title="Цвет текста" class="color-picker">
                <input type="color" data-command="hiliteColor" title="Цвет фона" value="#ffffff" class="color-picker">
            </div>
            <div class="editor-toolbar-group">
                <button type="button" data-command="justifyLeft" title="По левому краю"><i class="fas fa-align-left"></i></button>
                <button type="button" data-command="justifyCenter" title="По центру"><i class="fas fa-align-center"></i></button>
                <button type="button" data-command="justifyRight" title="По правому краю"><i class="fas fa-align-right"></i></button>
                <button type="button" data-command="justifyFull" title="По ширине"><i class="fas fa-align-justify"></i></button>
            </div>
            <div class="editor-toolbar-group">
                <button type="button" data-command="insertUnorderedList" title="Маркированный список"><i class="fas fa-list-ul"></i></button>
                <button type="button" data-command="insertOrderedList" title="Нумерованный список"><i class="fas fa-list-ol"></i></button>
                <button type="button" data-command="outdent" title="Уменьшить отступ"><i class="fas fa-outdent"></i></button>
                <button type="button" data-command="indent" title="Увеличить отступ"><i class="fas fa-indent"></i></button>
            </div>
            <div class="editor-toolbar-group">
                <button type="button" data-command="insertImage" title="Вставить изображение"><i class="fas fa-image"></i></button>
                <button type="button" data-command="createLink" title="Вставить ссылку"><i class="fas fa-link"></i></button>
                <button type="button" data-command="unlink" title="Удалить ссылку"><i class="fas fa-unlink"></i></button>
                <button type="button" data-command="insertHorizontalRule" title="Горизонтальная линия"><i class="fas fa-minus"></i></button>
            </div>
            <div class="editor-toolbar-group">
                <button type="button" data-command="removeFormat" title="Очистить форматирование"><i class="fas fa-remove-format"></i></button>
                <button type="button" data-command="toggleCode" title="Просмотр HTML"><i class="fas fa-code"></i></button>
            </div>
        `;
        
        // Создаем область редактирования
        const editableArea = document.createElement('div');
        editableArea.className = 'editor-content';
        editableArea.contentEditable = true;
        editableArea.innerHTML = targetElement.value || '<p><br></p>';
        
        // Скрываем исходный textarea
        targetElement.style.display = 'none';
        targetElement.classList.add('editor-original-input');
        
        // Добавляем элементы в контейнер
        editorContainer.appendChild(toolbar);
        editorContainer.appendChild(editableArea);
        
        // Вставляем редактор после целевого элемента
        targetElement.parentNode.insertBefore(editorContainer, targetElement.nextSibling);
        
        // Связываем редактор с целевым элементом
        editableArea.dataset.target = targetElement.id;
        
        // Добавляем обработчики событий
        this.setupEventListeners(editorContainer, targetElement);
    },
    
    // Настройка обработчиков событий
    setupEventListeners: function(editorContainer, targetElement) {
        const editableArea = editorContainer.querySelector('.editor-content');
        const toolbar = editorContainer.querySelector('.editor-toolbar');
        let isInCodeView = false;
        
        // Обработчик кнопок панели инструментов
        toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            
            const command = button.dataset.command;
            
            if (command === 'toggleCode') {
                this.toggleCodeView(editableArea, targetElement);
                isInCodeView = !isInCodeView;
                return;
            }
            
            if (isInCodeView) return;
            
            if (command === 'insertImage') {
                const url = prompt('Введите URL изображения:');
                if (url) {
                    document.execCommand('insertImage', false, url);
                }
                return;
            }
            
            if (command === 'createLink') {
                const url = prompt('Введите URL ссылки:');
                if (url) {
                    document.execCommand('createLink', false, url);
                }
                return;
            }
            
            // Выполняем команду
            document.execCommand(command, false, null);
            this.updateTargetElement(editableArea, targetElement);
        });
        
        // Обработчик выпадающих списков и выбора цвета
        toolbar.addEventListener('change', (e) => {
            if (isInCodeView) return;
            
            const select = e.target;
            const command = select.dataset.command;
            const value = select.value;
            
            document.execCommand(command, false, value);
            this.updateTargetElement(editableArea, targetElement);
        });
        
        // Обновляем значение textarea при изменении содержимого редактора
        editableArea.addEventListener('input', () => {
            if (!isInCodeView) {
                this.updateTargetElement(editableArea, targetElement);
            }
        });
        
        // Обрабатываем вставку из буфера обмена - ИЗМЕНЕНО для поддержки HTML при вставке
        editableArea.addEventListener('paste', (e) => {
            if (isInCodeView) return;
            
            // Если нужно вставлять как обычный текст без форматирования, используйте этот код:
            // e.preventDefault();
            // const text = (e.originalEvent || e).clipboardData.getData('text/plain');
            // document.execCommand('insertText', false, text);
            
            // А для вставки с сохранением форматирования просто не блокируем стандартное действие
            // и позволяем браузеру вставить контент как есть
            
            setTimeout(() => this.updateTargetElement(editableArea, targetElement), 0);
        });
        
        // Обеспечиваем фокус на редакторе при клике на контейнер
        editorContainer.addEventListener('click', (e) => {
            if (e.target === editorContainer || e.target.classList.contains('editor-content')) {
                editableArea.focus();
            }
        });
        
        // Обеспечиваем фокус на редакторе при клике на любую часть контейнера
        editorContainer.addEventListener('mousedown', (e) => {
            // Если клик не по кнопке в панели инструментов
            if (!e.target.closest('.editor-toolbar button') && 
                !e.target.closest('.editor-toolbar select') &&
                !e.target.closest('.editor-toolbar input')) {
                setTimeout(() => editableArea.focus(), 0);
            }
        });
        
        // Убираем запрет на выделение текста в редакторе
        editableArea.addEventListener('mousedown', (e) => {
            e.stopPropagation(); // Останавливаем всплытие события
        });
        
        // Предотвращаем потерю фокуса при нажатии на кнопки панели
        toolbar.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
    },
    
    // Переключение между визуальным редактором и HTML-кодом
    toggleCodeView: function(editableArea, targetElement) {
        if (editableArea.contentEditable === 'true') {
            // Переключаемся в режим HTML
            editableArea.contentEditable = 'false';
            editableArea.innerHTML = this.formatHtml(editableArea.innerHTML);
            editableArea.classList.add('code-view');
        } else {
            // Переключаемся в визуальный режим
            const html = editableArea.innerText;
            editableArea.contentEditable = 'true';
            editableArea.innerHTML = html;
            editableArea.classList.remove('code-view');
        }
        
        this.updateTargetElement(editableArea, targetElement);
    },
    
    // Обновление значения оригинального textarea
    updateTargetElement: function(editableArea, targetElement) {
        // В режиме HTML-кода берем innerText, иначе innerHTML
        if (editableArea.contentEditable === 'false') {
            targetElement.value = editableArea.innerText;
        } else {
            targetElement.value = editableArea.innerHTML;
        }
        
        // Вызываем событие change
        targetElement.dispatchEvent(new Event('change', { bubbles: true }));
    },
    
    // Форматирование HTML для лучшей читаемости в режиме кода
    formatHtml: function(html) {
        let formatted = '';
        let indent = '';
        
        html.split(/>\s*</).forEach(function(node) {
            if (node.match(/^\/\w/)) {
                indent = indent.substring(2);
            }
            
            formatted += indent + '<' + node + '>\r\n';
            
            if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith('<br')) {
                indent += '  ';
            }
        });
        
        return formatted.substring(1, formatted.length - 3);
    },
    
    // Получение HTML-содержимого из редактора
    getContent: function(targetId) {
        const target = document.getElementById(targetId);
        if (!target) return '';
        
        return target.value;
    },
    
    // Установка HTML-содержимого в редактор
    setContent: function(targetId, html) {
        const target = document.getElementById(targetId);
        if (!target) return;
        
        target.value = html;
        
        // Находим связанную с textarea область редактирования
        const editableArea = document.querySelector(`.editor-content[data-target="${targetId}"]`);
        if (editableArea) {
            editableArea.innerHTML = html;
        }
    }
};

// Добавляем стили для редактора
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .custom-editor-container {
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 20px;
            background: #fff;
        }
        
        .editor-toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            padding: 10px;
            background: #f5f5f5;
            border-bottom: 1px solid #ddd;
        }
        
        .editor-toolbar-group {
            display: flex;
            gap: 2px;
            margin-right: 10px;
        }
        
        .editor-toolbar button, 
        .editor-toolbar select,
        .editor-toolbar .color-picker {
            padding: 6px 10px;
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 3px;
            color: #555;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
            height: 30px;
        }
        
        .editor-toolbar button:hover,
        .editor-toolbar select:hover {
            background: #f0f0f0;
        }
        
        .editor-toolbar button:active {
            background: #e0e0e0;
        }
        
        .editor-content {
            min-height: 300px;
            padding: 15px;
            overflow-y: auto;
            line-height: 1.5;
            font-family: 'Montserrat', Arial, sans-serif;
            font-size: 14px;
            user-select: text;
            -webkit-user-select: text;
            -moz-user-select: text;
            -ms-user-select: text;
        }
        
        .editor-content:focus {
            outline: none;
        }
        
        .editor-content.code-view {
            white-space: pre;
            font-family: monospace;
            font-size: 14px;
            background: #f9f9f9;
            color: #333;
        }
        
        .editor-content img {
            max-width: 100%;
            height: auto;
        }
        
        .color-picker {
            padding: 0 !important;
            width: 30px;
            height: 30px;
        }
        
        .format-select, .font-size-select {
            min-width: 120px;
        }
    `;
    
    document.head.appendChild(style);
}); 