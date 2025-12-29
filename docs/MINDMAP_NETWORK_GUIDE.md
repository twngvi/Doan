# � The Breathing Map - Interactive Network Mindmap

## 🎯 Concept

**"The Breathing Map"** là một mindmap thông minh, tự động co giãn như lồng ngực:

- **Hít vào** (expand): Khi mở rộng nội dung, bản đồ tự động zoom out để hiển thị hết
- **Thở ra** (fit): Camera tự động điều chỉnh để luôn nhìn thấy toàn bộ

Giống như Google Maps tự động zoom khi bạn search địa điểm mới!

---

## ✨ Tính Năng Chính

### 1. **Auto Fit-to-Screen (Vừa khít màn hình)**

- Khi mở mindmap lần đầu → Tự động zoom/pan để hiển thị toàn bộ
- Padding 8% xung quanh để không bị sát mép
- Smooth animation 0.6s với cubic-bezier easing

### 2. **The Breathing Effect (Hiệu ứng thở)**

- Click vào node → Detail pills mọc ra
- **TỰ ĐỘNG**: Camera zoom out + pan để hiển thị cả node cha và detail
- Luôn giữ tất cả nội dung trong tầm nhìn

### 3. **Free Roam (Tự do khám phá)**

- **Scroll chuột**: Zoom in/out (0.3x - 3x)
- **Drag background**: Pan (di chuyển) bản đồ
- **Click node**: Focus và mở detail
- Disable auto-fit khi user tự zoom/pan

### 4. **Smart Controls**

- 🎯 **Fit to Screen**: Reset về trạng thái auto-fit
- 🔄 **Reset**: Đóng tất cả detail nodes
- ➕ **Zoom In**: Phóng to
- ➖ **Zoom Out**: Thu nhỏ

---

## 🎨 Visual Design

### Layout

- **Center Node**: 180x180px, pulse glow animation
- **Satellite Nodes**: 120x120px, radial layout (bán kính 32%)
- **Detail Pills**: Tỏa ra với bán kính 15% từ node cha

### Colors (8 màu)

- 🟣 Purple: #7c3aed
- 🩷 Pink: #ec4899
- 🔵 Blue: #3b82f6
- 🌊 Cyan: #06b6d4
- 🟢 Green: #10b981
- 🟡 Yellow: #f59e0b
- 🔴 Red: #ef4444
- 🟣 Indigo: #6366f1

### Animations

- **Pulse Glow**: Center node đập 3s/cycle
- **Node Appear**: Xoay + scale khi render
- **Detail Pop**: Pills bay ra khi click
- **Smooth Pan/Zoom**: 0.6s ease-out

---

## 🎮 User Flow

```
1. Mở mindmap
   ↓ (Auto-fit 0.6s)
2. Toàn bộ nodes hiển thị vừa màn hình

3. Click "Biến" node
   ↓ (Details mọc ra)
4. Camera zoom out để hiển thị cả "Biến" + 4 detail pills

5. User scroll chuột
   ↓ (Disable auto-fit)
6. Zoom in để đọc text rõ hơn

7. User drag background
   ↓ (Free pan)
8. Di chuyển đến node "Hàm"

9. Click "Fit to Screen" button
   ↓ (Re-enable auto-fit)
10. Quay lại trạng thái vừa khít màn hình
```

---

## 🔧 Technical Implementation

### State Management

```javascript
networkState = {
  zoom: 1, // Mức zoom (0.3 - 3)
  panX: 0, // Pan X (pixels)
  panY: 0, // Pan Y (pixels)
  isDragging: false, // Đang kéo?
  focusedNodeIndex: null,
  nodePositions: [], // Track vị trí cho bounding box
};
```

### Core Functions

#### `fitToScreen(animate)`

Tính toán bounding box và auto-adjust zoom/pan:

1. Tìm min/max X/Y của tất cả nodes
2. Thêm padding 8%
3. Tính optimal zoom = min(zoomX, zoomY, 1.2)
4. Tính pan để center content
5. Apply transform với animation

#### `initPanZoomControls()`

Setup event listeners:

- Mouse wheel → zoom
- Mouse drag → pan
- Touch gestures → mobile support

#### `toggleNodeExpansion()`

Mở detail nodes + trigger breathing:

1. Render detail pills
2. Store positions to `nodePositions`
3. Call `fitToScreen()` sau 100ms

---

## 📊 Bounding Box Calculation

```javascript
// Example với 1 center + 5 satellites + 4 details
nodePositions = [
  { x: 50, y: 50, type: 'center' },
  { x: 50, y: 18, type: 'satellite' }, // Top
  { x: 81, y: 35, type: 'satellite' }, // Right-top
  // ... 3 satellites khác
  { x: 65, y: 25, type: 'detail' },    // Detail 1
  { x: 70, y: 30, type: 'detail' },    // Detail 2
  // ... 2 details khác
]

minX = 18, maxX = 81, minY = 18, maxY = 82
→ contentWidth = 63%, contentHeight = 64%
→ optimalZoom = min(100/63, 100/64, 1.2) = 1.2
→ Camera zoom to 1.2x và center tại (49.5%, 50%)
```

---

## 🚀 Advanced Features (Future)

### Phase 2

- [ ] **Pinch-to-zoom**: Mobile gestures
- [ ] **Double-click**: Zoom to node
- [ ] **Minimap**: Overview panel
- [ ] **Animation trails**: Particle effects on connections

### Phase 3

- [ ] **Force-directed layout**: Physics simulation
- [ ] **Elastic connections**: Rubber-band effect
- [ ] **Node clustering**: Group related nodes
- [ ] **3D Mode**: Depth layers

---

## 💡 Performance Tips

1. **Throttle pan/zoom**: Limit updates to 60fps
2. **Use transform**: GPU-accelerated, không trigger reflow
3. **Lazy render details**: Chỉ render khi visible
4. **Optimize SVG paths**: Reduce node count

---

## 🐛 Known Issues & Fixes

### Issue: Zoom quá nhanh

**Fix**: Giảm delta trong `handleMouseWheel`

```javascript
const delta = -e.deltaY / 1500; // Từ 1000 → 1500
```

### Issue: Pan không smooth

**Fix**: Thêm transition vào container

```css
.network-container {
  transition: transform 0.1s ease-out;
}
```

### Issue: Fit-to-screen sai với ít nodes

**Fix**: Thêm minimum zoom

```javascript
const optimalZoom = Math.max(0.8, Math.min(zoomX, zoomY, 1.2));
```

---

## 📝 Changelog

### v3.0.0 - The Breathing Map (Dec 28, 2025)

- ✅ Auto fit-to-screen on load
- ✅ Breathing effect khi expand nodes
- ✅ Mouse wheel zoom (0.3x - 3x)
- ✅ Drag to pan
- ✅ Touch support cho mobile
- ✅ Smart bounding box calculation
- ✅ 4 control buttons (Fit, Reset, Zoom+, Zoom-)
- ✅ Disable auto-fit khi user interact

### v2.0.0 - Network Graph (Dec 28, 2025)

- ✅ Radial layout
- ✅ Progressive disclosure
- ✅ SVG connections

---

🫁 **The Breathing Map** - Một mindmap biết "thở", luôn tự điều chỉnh để bạn nhìn thấy mọi thứ!

---

## ✨ Tính Năng Mới

### 1. **Radial Layout (Bố cục tỏa tròn)**

- **Node Trung tâm**: Hình tròn lớn ở giữa màn hình, đập nhẹ (pulse) để thu hút sự chú ý
- **Satellite Nodes**: Các hình tròn nhỏ hơn bay lơ lửng xung quanh node trung tâm
- **Đường nối**: Các đường cong mượt mà nối từ tâm ra các node vệ tinh

### 2. **Progressive Disclosure (Tiết lộ dần dần)**

- Ban đầu chỉ hiển thị node trung tâm và các tiêu đề chính
- Click vào node → hiện chi tiết (detail pills) xung quanh node đó
- Các node khác tự động mờ đi để tập trung vào phần đang xem

### 3. **Animated Connections (Đường nối động)**

- Đường nối có hiệu ứng cong mượt (curved paths)
- Các đốm sáng (pulses) chạy dọc theo đường nối để thể hiện luồng tư duy
- Màu sắc tương ứng với từng loại kiến thức

### 4. **Interactive Controls (Điều khiển tương tác)**

- **Reset Button** (🔄): Đặt lại view về trạng thái ban đầu
- **Expand All** (➕): Mở tất cả các node (sẽ bổ sung)
- **Collapse All** (➖): Đóng tất cả các node

---

## 🎨 Thiết Kế Visual

### Colors (Màu sắc)

- 🟣 **Purple**: #7c3aed - Khái niệm cơ bản
- 🩷 **Pink**: #ec4899 - Quy trình
- 🔵 **Blue**: #3b82f6 - Biến & Dữ liệu
- 🌊 **Cyan**: #06b6d4 - Thuật toán
- 🟢 **Green**: #10b981 - Ứng dụng
- 🟡 **Yellow**: #f59e0b - Lưu ý
- 🔴 **Red**: #ef4444 - Cảnh báo
- 🟣 **Indigo**: #6366f1 - Nâng cao

### Animations (Hiệu ứng)

- **Pulse Glow**: Node trung tâm đập nhẹ mỗi 3 giây
- **Node Appear**: Các node xuất hiện với hiệu ứng xoay + phóng to
- **Detail Pills**: Các chi tiết bay ra từ node cha
- **Line Pulse**: Đốm sáng chạy dọc đường nối

---

## 🎮 Cách Sử Dụng

### Bước 1: Xem tổng quan

- Khi mở tab Mindmap, bạn sẽ thấy:
  - 1 node trung tâm (Tên bài học)
  - Các node vệ tinh xung quanh (Các chủ đề chính)
  - Đường nối từ tâm ra các node

### Bước 2: Khám phá chi tiết

1. **Click vào node vệ tinh** bất kỳ
2. Các chi tiết (detail pills) sẽ "nở" ra xung quanh node đó
3. Các node khác tự động mờ đi
4. Đường nối được highlight

### Bước 3: Reset view

- Click vào **node trung tâm** HOẶC
- Click vào nút **Reset** (🔄) ở góc dưới bên phải

---

## 📱 Responsive Design

### Desktop (> 768px)

- Node trung tâm: 180x180px
- Satellite nodes: 120x120px
- Bán kính quỹ đạo: 32% (từ tâm màn hình)

### Mobile (≤ 768px)

- Node trung tâm: 140x140px
- Satellite nodes: 100x100px
- Font size giảm nhẹ để vừa màn hình

---

## 🔧 Technical Details

### Files Changed

1. **lesson_content.html**:

   - Thay `.mindmap-simple` → `.mindmap-network`
   - Thêm SVG layer cho connection lines
   - Thêm controls buttons

2. **lesson_styles.html**:

   - Radial layout với absolute positioning
   - SVG path animations
   - Pulse & glow effects
   - Dark gradient background

3. **lesson_scripts.html**:
   - `renderMindmap()`: Tính toán vị trí radial
   - `drawConnection()`: Vẽ SVG paths với animation
   - `toggleNodeExpansion()`: Progressive disclosure logic
   - `resetMindmapView()`: Reset về trạng thái ban đầu

---

## 🚀 Next Steps (Tương lai)

### Phase 2 Enhancements

- [ ] **Zoom & Pan**: Cho phép phóng to/thu nhỏ và kéo thả canvas
- [ ] **Search**: Tìm kiếm node theo từ khóa
- [ ] **Export**: Xuất mindmap ra hình ảnh PNG/SVG
- [ ] **Themes**: Chế độ Light/Dark mode
- [ ] **Touch Gestures**: Hỗ trợ pinch-to-zoom trên mobile

### Advanced Features

- [ ] **3D Mode**: Mindmap 3D với Three.js
- [ ] **Collaboration**: Nhiều người cùng xem và tương tác
- [ ] **AI Suggestions**: AI gợi ý thêm nội dung vào mindmap

---

## 📊 So Sánh Trước/Sau

| Tính năng            | Trước (Grid Layout)       | Sau (Network Graph)        |
| -------------------- | ------------------------- | -------------------------- |
| **Layout**           | Grid cards xếp thành lưới | Radial network tỏa tròn    |
| **Hiển thị ban đầu** | Hiện tất cả content       | Chỉ hiện tiêu đề           |
| **Tương tác**        | Click để đóng/mở card     | Click để "nở hoa" chi tiết |
| **Visual Impact**    | Đơn giản, tĩnh            | Động, hiện đại, công nghệ  |
| **Thân thiện**       | Nhiều chữ, choáng ngợp    | Thoáng, tiệm tiến          |

---

## 💡 Tips & Tricks

1. **Click node trung tâm** bất cứ lúc nào để reset view
2. **Hover vào node** để xem hiệu ứng phóng to
3. **Màu sắc** giúp phân biệt các loại kiến thức
4. **Detail pills** có thể hover để xem hiệu ứng nâng lên

---

## 🐛 Troubleshooting

### Vấn đề: Không thấy mindmap

- Kiểm tra console log xem có lỗi parse JSON không
- Đảm bảo data.branches không rỗng

### Vấn đề: Đường nối không xuất hiện

- Kiểm tra SVG layer có được render không
- Đảm bảo `drawConnection()` được gọi cho mỗi node

### Vấn đề: Detail pills không hiện

- Kiểm tra `children` array trong data
- Xem console log khi click vào node

---

## 📝 Changelog

### v2.0.0 - Network Graph Redesign (Dec 28, 2025)

- ✅ Chuyển từ grid layout sang radial network
- ✅ Thêm animated SVG connections
- ✅ Progressive disclosure (click to expand)
- ✅ Pulse animations cho center node
- ✅ Control buttons (reset, expand, collapse)
- ✅ Responsive design cho mobile

---

Tận hưởng trải nghiệm mindmap mới! 🎉
