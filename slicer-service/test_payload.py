import requests

url = 'http://127.0.0.1:8989/test_upload'

files = {
    'file': ('Stitchxpikachu(3).3mf', b'dummy content', 'application/octet-stream')
}
data = {
    'material': 'pla',
    'qualityProfile': 'standard',
    'infillPercent': '25',
    'scaleFactor': '1',
    'scaleX': '1',
    'scaleY': '1',
    'scaleZ': '1',
    'requestedDimensionsJson': '{"x":114.2,"y":108.4,"z":160.1}',
    'quantity': '1',
    'supportMode': 'auto',
    'packagingIncluded': 'false',
    'idempotencyKey': '2d020cb8-b4a5-4517-8736-2850f754822a',
    'pricingConfigJson': '{"printerCost":25000,"printerLifespanHours":5000,"printerPowerWatts":100,"electricityRatePerKwh":8,"failureBufferPercent":10,"labourRatePerHour":200,"finishingMinutes":5,"baseServiceFee":30,"minimumOrderValue":149,"markupMultiplier":2.2,"gstEnabled":false,"gstRate":18,"packagingPrice":20,"maxBuildVolume":{"x":256,"y":256,"z":200}}',
    'materialsJson': '[{"id":"pla","name":"PLA","pricePerGram":4.5,"density":1.24,"enabled":true,"tagline":"Standard, crisp & rigid thermoplastic","description":"Ideal for everyday models, display pieces, architectural maquettes, and visual prototypes.","colors":[{"name":"Matte Black","hex":"#1C1917"},{"name":"Pure White","hex":"#F8FAFC"},{"name":"Crimson Red","hex":"#EF4444"},{"name":"Royal Blue","hex":"#2563EB"},{"name":"Forest Green","hex":"#15803D"},{"name":"Steel Grey","hex":"#64748B"},{"name":"Bright Orange","hex":"#F97316"},{"name":"Sunshine Yellow","hex":"#EAB308"}]},{"id":"petg","name":"PETG","pricePerGram":5.5,"density":1.27,"enabled":true,"tagline":"Impact-resistant & outdoor durable","description":"High mechanical strength and temperature resistance. Best for mechanical brackets, enclosures, and functional parts.","colors":[{"name":"Carbon Black","hex":"#0F172A"},{"name":"Clear White","hex":"#F1F5F9"},{"name":"Industrial Grey","hex":"#475569"},{"name":"Ocean Blue","hex":"#0284C7"},{"name":"Signal Orange","hex":"#EA580C"},{"name":"Fire Red","hex":"#DC2626"},{"name":"Army Green","hex":"#166534"},{"name":"Translucent Clear","hex":"#E2E8F0"}]},{"id":"tpu","name":"TPU (Flexible)","pricePerGram":7,"density":1.21,"enabled":true,"tagline":"Rubber-like flexible & shock-absorbing","description":"High elasticity, impact dampening, and abrasion resistance. Best for gaskets, phone bumpers, and protective covers.","colors":[{"name":"Jet Black","hex":"#18181B"},{"name":"Natural White","hex":"#E2E8F0"},{"name":"Safety Red","hex":"#DC2626"},{"name":"Vibrant Blue","hex":"#3B82F6"},{"name":"Neon Yellow","hex":"#FACC15"},{"name":"Olive Green","hex":"#3F6212"}]}]',
    'quantityDiscountsJson': '[{"minQuantity":1,"maxQuantity":4,"discountPercent":0},{"minQuantity":5,"maxQuantity":9,"discountPercent":5},{"minQuantity":10,"maxQuantity":24,"discountPercent":10},{"minQuantity":25,"discountPercent":15}]',
    'pricingVersion': '2026-09-05-v11',
    'productionPrinterProfileJson': '{"id":"BAMBU-A1-MINI-01","manufacturer":"Bambu Lab","model":"Bambu Lab A1 mini","displayName":"Bambu Lab A1 mini","printerProfileFile":"bambu_production_0.4.ini","enabled":true,"defaultForProduction":true,"slicerAdapter":"bambu_studio_cli","slicerName":"Bambu Studio","slicerVersion":"02.08.02.61","slicerSettingsId":"GM020","printerSettingsId":"Bambu Lab A1 mini 0.4 nozzle","processSettingsId":"0.20mm Standard @BBL A1M","materialProfileIds":["Generic PLA @BBL A1M"],"machineProfileFile":"Bambu Lab A1 mini 0.4 nozzle.json","processProfileFile":"0.20mm Standard @BBL A1M.json","buildVolumeX":180,"buildVolumeY":180,"buildVolumeZ":180,"nozzleDiameter":0.4,"extruderCount":1,"supportsMulticolor":true,"machineParameters":{"printerStructure":"i3","printerVariant":"0.4"},"defaultLayerHeight":0.2,"defaultInfill":20,"defaultSupportMode":"auto","toolpathDefaults":{"arrange":0},"profileVersion":"1.0","updatedAt":"2026-09-15T06:44:43.368Z"}',
    'productionPrinterProfilesJson': '[{"id":"BAMBU-A1-MINI-01","manufacturer":"Bambu Lab","model":"Bambu Lab A1 mini","displayName":"Bambu Lab A1 mini","printerProfileFile":"bambu_production_0.4.ini","enabled":true,"defaultForProduction":true,"slicerAdapter":"bambu_studio_cli","slicerName":"Bambu Studio","slicerVersion":"02.08.02.61","slicerSettingsId":"GM020","printerSettingsId":"Bambu Lab A1 mini 0.4 nozzle","processSettingsId":"0.20mm Standard @BBL A1M","materialProfileIds":["Generic PLA @BBL A1M"],"machineProfileFile":"Bambu Lab A1 mini 0.4 nozzle.json","processProfileFile":"0.20mm Standard @BBL A1M.json","buildVolumeX":180,"buildVolumeY":180,"buildVolumeZ":180,"nozzleDiameter":0.4,"extruderCount":1,"supportsMulticolor":true,"machineParameters":{"printerStructure":"i3","printerVariant":"0.4"},"defaultLayerHeight":0.2,"defaultInfill":20,"defaultSupportMode":"auto","toolpathDefaults":{"arrange":0},"profileVersion":"1.0","updatedAt":"2026-09-15T06:44:43.368Z"},{"id":"BAMBU-A1-01","manufacturer":"Bambu Lab","model":"A1","displayName":"Bambu Lab A1","printerProfileFile":"bambu_a1_0.4.ini","enabled":true,"defaultForProduction":false,"slicerAdapter":"bambu_studio_cli","slicerName":"Bambu Studio","slicerVersion":"02.08.02.61","slicerSettingsId":"GM020","printerSettingsId":"Bambu Lab A1 0.4 nozzle","processSettingsId":"0.20mm Standard @BBL A1","materialProfileIds":["Generic PLA @BBL A1M"],"machineProfileFile":"Bambu Lab A1 0.4 nozzle.json","processProfileFile":"0.20mm Standard @BBL A1.json","buildVolumeX":256,"buildVolumeY":256,"buildVolumeZ":256,"nozzleDiameter":0.4,"extruderCount":1,"supportsMulticolor":true,"machineParameters":{},"defaultLayerHeight":0.2,"defaultInfill":20,"defaultSupportMode":"auto","toolpathDefaults":{"arrange":0},"profileVersion":"Bambu Studio machine profile GM020","updatedAt":"2026-09-15T06:44:43.368Z"}]'
}

response = requests.post(url, files=files, data=data)
print(response.status_code)
print(response.text)

