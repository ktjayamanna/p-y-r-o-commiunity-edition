# === BASE STAGE ===
FROM python:3.9 AS base

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y \
    build-essential \
    autoconf \
    automake \
    libtool \
    tar \
    curl
RUN apt-get update && apt-get install -y ffmpeg

# Set work directory
WORKDIR /code

# Create the data, background_music, and workdir directories
RUN mkdir -p /code/data/background_music /code/data/workdir

COPY requirements.txt /code/
# RUN pip install torch==2.1.2 torchaudio==2.1.2 --index-url https://download.pytorch.org/whl/cpu
RUN pip3 install --no-cache-dir -r requirements.txt

####### SoundTouch installation #######
RUN curl -o /tmp/soundtouch-2.3.0.tar.gz -L https://www.surina.net/soundtouch/soundtouch-2.3.0.tar.gz
RUN tar -xzf /tmp/soundtouch-2.3.0.tar.gz -C /tmp
WORKDIR /tmp

# Compile and install SoundTouch
WORKDIR /tmp/soundtouch-2.3.0
RUN ./bootstrap \
    && ./configure \
    && make \
    && make install

# Cleanup
RUN apt-get remove --purge -y \
    build-essential \
    autoconf \
    automake \
    libtool \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

####### End of SoundTouch installation #######

# Set work directory back to /code
WORKDIR /code

# Make port 8000 available
EXPOSE 8000

# === DEVELOPMENT STAGE ===
FROM base AS development

# Install bash-completion for development environment
RUN apt-get update && \
    apt-get install -y bash-completion && \
    rm -rf /var/lib/apt/lists/*

# Configure bash completion for development environment
RUN echo 'if [ -f /etc/bash_completion ]; then' >> /root/.bashrc && \
    echo '    . /etc/bash_completion' >> /root/.bashrc && \
    echo 'fi' >> /root/.bashrc

# Copy all necessary files and directories for development
COPY . /code/

# Define environment variable for development (you can add more if needed)
ENV NAME World

# Set the default command for development
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "flask_api:app"]

# === PRODUCTION STAGE ===
FROM base AS production

# Set permissions for the data directory
RUN chmod -R a+rw /code/data/

COPY flask_api.py /code/
COPY utils.py /code/
COPY data_classes.py /code/
COPY config.py /code/
COPY VERSION /code/

# set the time out to 120 secs
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "flask_api:app", "--timeout", "120"]
