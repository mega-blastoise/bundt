export default `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>500 | Waavy Internal Server Error</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #e5e5e5;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            position: relative;
        }

        /* Animated gradient background */
        .gradient-bg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 40% 80%, rgba(120, 219, 226, 0.15) 0%, transparent 50%);
            animation: float 20s ease-in-out infinite;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-20px) rotate(1deg); }
            66% { transform: translateY(10px) rotate(-1deg); }
        }

        .container {
            text-align: center;
            z-index: 10;
            position: relative;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 3rem 2rem;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .error-code {
            font-size: 4rem;
            font-weight: 800;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1rem;
            letter-spacing: -0.02em;
        }

        .error-message {
            font-size: 1.25rem;
            font-weight: 600;
            color: #a1a1aa;
            margin-bottom: 2rem;
            line-height: 1.4;
        }

        .back-button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: #e5e5e5;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .back-button:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
        }

        .back-button:active {
            transform: translateY(0);
        }

        /* Subtle floating elements */
        .floating-dot {
            position: absolute;
            width: 4px;
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            animation: floatDot 15s linear infinite;
        }

        .floating-dot:nth-child(1) {
            top: 20%;
            left: 10%;
            animation-delay: 0s;
        }

        .floating-dot:nth-child(2) {
            top: 60%;
            right: 15%;
            animation-delay: 5s;
        }

        .floating-dot:nth-child(3) {
            bottom: 30%;
            left: 20%;
            animation-delay: 10s;
        }

        @keyframes floatDot {
            0% { transform: translateY(0px) opacity(0.3); }
            50% { transform: translateY(-100px) opacity(0.8); }
            100% { transform: translateY(-200px) opacity(0); }
        }
    </style>
</head>
<body>
    <div class="gradient-bg"></div>
    <div class="floating-dot"></div>
    <div class="floating-dot"></div>
    <div class="floating-dot"></div>
    
    <div class="container">
        <div class="error-code">500</div>
        <div class="error-message">Waavy Internal Server Error</div>
        <a href="javascript:history.back()" class="back-button">
            ← Go Back
        </a>
    </div>
</body>
</html>
`;
