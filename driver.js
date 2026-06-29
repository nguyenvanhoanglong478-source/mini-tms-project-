import { db } from './firebase-config.js';
import { ref, update, push } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const statusMessage = document.getElementById('status-message');
const statusSelect = document.getElementById('vehicleStatus');

// Mảng chứa danh sách ID phần tử input để dễ dàng khóa/mở khóa
const inputIds = ['vehicleId', 'driverName', 'startLocation', 'endLocation', 'customerName', 'cargoType', 'deliveryTime', 'surcharge'];
let watchId = null;

btnStart.addEventListener('click', () => {
    const vId = document.getElementById('vehicleId').value.trim().toUpperCase();
    const dName = document.getElementById('driverName').value.trim();
    const startLoc = document.getElementById('startLocation').value.trim();
    const endLoc = document.getElementById('endLocation').value.trim();
    const custName = document.getElementById('customerName').value.trim();
    const cargo = document.getElementById('cargoType').value;
    const delTime = document.getElementById('deliveryTime').value;
    const extraFee = document.getElementById('surcharge').value.trim();

    // Kiểm tra tính hợp lệ dữ liệu (bắt buộc nhập trừ Phí phụ thu)
    if (!vId || !dName || !startLoc || !endLoc || !custName || !delTime) {
        alert("Vui lòng nhập đầy đủ tất cả thông tin chuyến đi!");
        return;
    }

    if (!navigator.geolocation) {
        alert("Trình duyệt không hỗ trợ định vị GPS.");
        return;
    }

    // Khóa tất cả các trường nhập liệu khi chuyến đi bắt đầu
    inputIds.forEach(id => document.getElementById(id).disabled = true);
    btnStart.disabled = true;
    btnStop.disabled = false;
    statusMessage.innerText = "Đang kết nối GPS vệ tinh...";

    const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 };

    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const speed = position.coords.speed ? (position.coords.speed * 3.6).toFixed(1) : 0;
            const currentStatus = statusSelect.value;
            
            statusMessage.innerText = `Đang gửi dữ liệu... (Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)})`;

            const vehicleRef = ref(db, `vehicles/${vId}`);
            
            // Gửi cấu trúc thông tin tích hợp theo đúng yêu cầu bài tập
            update(vehicleRef, {
                driverName: dName,
                startLocation: startLoc,
                endLocation: endLoc,
                customerName: custName,
                cargoType: cargo,
                deliveryTime: delTime,
                surcharge: extraFee ? Number(extraFee) : 0,
                status: currentStatus,
                lat: lat,
                lng: lng,
                speed: speed,
                lastUpdate: Date.now()
            });

            // Lưu lịch sử đường đi (chỉ lưu tọa độ để vẽ polyline gọn nhẹ)
            if (currentStatus === "Đang giao hàng") {
                 push(ref(db, `vehicles/${vId}/history`), { lat, lng });
            }
        },
        (error) => {
            statusMessage.innerText = `Lỗi GPS: ${error.message}`;
            statusMessage.style.color = 'red';
        },
        options
    );
});

// Cập nhật nhanh trạng thái khi tài xế thay đổi dropdown
statusSelect.addEventListener('change', () => {
    if(watchId) {
        const vId = document.getElementById('vehicleId').value.trim().toUpperCase();
        update(ref(db, `vehicles/${vId}`), { status: statusSelect.value });
    }
});

btnStop.addEventListener('click', () => {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    
    const vId = document.getElementById('vehicleId').value.trim().toUpperCase();
    update(ref(db, `vehicles/${vId}`), { status: "Ngừng hoạt động" });

    // Mở khóa lại form nhập liệu
    inputIds.forEach(id => document.getElementById(id).disabled = false);
    btnStart.disabled = false;
    btnStop.disabled = true;
    statusMessage.innerText = "Đã hoàn thành/Dừng chuyến đi.";
});
