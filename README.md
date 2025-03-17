# ScolaIA

Don't waste time. Study smarter!

## About

ScolaIA is an innovative web application designed to transform the learning experience through personalized AI assistants. Its motto, **"Don't waste time. Study smarter!"**, reflects its core mission: optimizing the learning process through advanced artificial intelligence technologies.  

## **Overview**  
ScolaIA enables users to create, configure, and interact with specialized AI assistants for learning. The platform facilitates intelligent conversations with OpenAI's advanced language models, allowing students and educators to receive accurate answers, detailed explanations, and personalized study assistance.  

## **Key Features**  

### **Personalized AI Assistants**  
- Creation and customization of AI assistants tailored to different subjects and educational needs  
- Real-time chat interaction with advanced OpenAI models  
- Support for processing and analyzing educational documents  

### **Robust User System**  
- User registration and authentication with email verification  
- Administrator-approved user access  
- Role-based access control (regular user, administrator)  
- Profile management and personalized preferences  

### **Advanced Chat Interface**  
- Interactive chat with persistent history  
- WebSocket support for real-time communication  
- Ability to upload and analyze documents within conversations  
- Responsive design for mobile and desktop devices  

### **Comprehensive Administration Panel**  
- User management and approvals  
- AI model parameter configuration  
- Usage monitoring and activity analysis  
- User experience customization  

### **Security and Privacy**  
- Authentication via JWT tokens  
- Encryption of sensitive data such as passwords and API keys  
- Secure system configuration management  
- Protection against unauthorized access  

## **Technical Architecture**  
ScolaIA is built on a modern and robust technology stack:  

- **Backend:** FastAPI (Python), SQLAlchemy, OpenAI API  
- **Frontend:** TypeScript, Tailwind CSS, Bootstrap, Jinja2 Templates  
- **Database:** SQLite (with migration support)  
- **Authentication:** JWT system with roles and permissions  
- **Integration:** OpenAI API for advanced language models  

## **Use Cases**  

### **Students**  
- Obtain detailed explanations of complex concepts  
- Receive personalized assistance in solving academic problems  
- Analyze and understand educational documents  
- Engage in structured educational conversations with progress tracking  

### **Educators**  
- Create specialized assistants for specific subjects  
- Provide complementary learning resources  
- Monitor student progress and needs  
- Optimize time spent answering frequently asked questions  

### **Educational Institutions**  
- Implement a scalable learning assistance solution  
- Offer 24/7 academic support to students  
- Collect data on common areas of difficulty  
- Enhance the overall educational experience  

ScolaIA represents an evolution in educational tools, combining the power of advanced language models with a platform specifically designed for the educational context. It empowers both students and educators to fully leverage artificial intelligence capabilities to enhance the learning process.


## Setup

### Prerequisites

- Git (version control system)
- Python 3.8 or higher
- Node.js (for frontend components)
- Internet connection for downloading dependencies and accessing OpenAI API

### Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Linux/Mac
# or
venv\Scripts\activate  # On Windows
```

2. Clone the repository from GitHub:
```bash
git clone https://github.com/ppernias/scolaia-desk.git
cd scolaia-desk
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Install Node.js dependencies (for frontend components):
```bash
npm install  # o yarn install
```

5. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Generate a secure SECRET_KEY:
   ```bash
   # Use this command to generate a secure random key
   openssl rand -hex 32
   ```
   - Update the `.env` file with your configuration:
   ```
   # Critical security settings
   SECRET_KEY=your-generated-secure-key
   
   # OpenAI API Key (get from https://platform.openai.com/api-keys)
   OPENAI_API_KEY=your-openai-api-key
   
   # Email configuration
   SMTP_HOST=your-smtp-host
   SMTP_USER=your-email
   SMTP_PASSWORD=your-password
   ```
   
   > **IMPORTANT**: Never commit your `.env` file to version control!
   > The SECRET_KEY should be kept secure and not changed once the application is in use,
   > as it's used to encrypt sensitive data and sign authentication tokens.

6. Start the server:
```bash
uvicorn app.main:app --reload
```

Visit http://localhost:8000 to access the application or http://localhost:8000/docs to view the API documentation.
(change localhost by the ip of your server if it is neccesary)

### Network Access and Production Deployment

To make the server accessible from other computers on the network, run with the host parameter:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

For production environments, it's recommended to use multiple workers:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The number of workers should typically be 2-4× the number of CPU cores.

### Autostart on System Boot

#### Using Systemd (Linux)

1. Create a service file:

```bash
sudo nano /etc/systemd/system/scolaia.service
```

2. Add the following content:

```
[Unit]
Description=ScolaIA Application Service
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/path/to/scolaia-desk
Environment="PATH=/path/to/venv/bin:$PATH"
ExecStart=/path/to/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

3. Replace `/path/to/scolaia-desk` with the actual path to your project directory (e.g., `/root/scolaia-desk`)
4. Replace `/path/to/venv` with the actual path to your virtual environment (e.g., `/root/venv`)

5. Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable scolaia.service
sudo systemctl start scolaia.service
```

6. Check status:

```bash
sudo systemctl status scolaia.service
```

7. If you encounter any issues, check the logs:

```bash
sudo journalctl -u scolaia.service
```

## Troubleshooting

### PyYAML Installation Error

If you encounter an error related to PyYAML installation like:
```
AttributeError: cython_sources
```

You can solve it in one of these ways:

1. **Install required development libraries** (RECOMMENDED):
```bash
# For Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y python3-dev libyaml-dev

# For Red Hat/CentOS
sudo yum install -y python3-devel libyaml-devel
```
This is the recommended solution as it provides the best performance by enabling the C extension for PyYAML.

2. **Use a pre-built wheel instead**:
```bash
pip install --upgrade pip
pip install wheel
pip install --only-binary :all: PyYAML==5.4.1
pip install -r requirements.txt
```

3. **Modify requirements.txt to use a pure Python version**:
```bash
# Replace the PyYAML line in requirements.txt with:
PyYAML==5.4.1 --global-option=--without-libyaml
```

## Security Notes

- The application uses the SECRET_KEY to encrypt sensitive data in the database and sign authentication tokens.
- If you change the SECRET_KEY after the application has been in use:
  - All existing user sessions will be invalidated
  - Previously encrypted data will become unreadable
- Store your production SECRET_KEY securely and consider using a secret management solution for production deployments.


## Licene of Use: Apache 2.0 @2025, Pedro A Pernias

1. Grant of Rights

You are free to use, copy, modify, and distribute covered works, including for commercial purposes.
You do not have to release your modifications under the same license, but you must maintain the required notices and disclaimers.
2. Patent Protection

The license includes a patent grant: contributors automatically provide users with a license to their patents related to the contributed code.
This grant terminates if you engage in a patent lawsuit claiming that the software infringes your patents.
3. Requirements and Notices

You must include a copy of the Apache License 2.0 and the original copyright statements with any copies or substantial portions of the software.
If you modify the software, you should note significant changes in your source files.
4. Disclaimer of Warranty and Limitation of Liability

The software is provided “as is,” without warranties or conditions of any kind.
Neither the authors nor contributors accept liability for any damages arising from its use.
5. Trademark Use

The license does not grant permission to use contributors’ trademarks. Separate permission may be required.
For full details, please refer to the Apache License 2.0 text. If you have specific concerns, consult a qualified legal professional.