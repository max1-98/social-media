# social-media
 My sports social media website and app. 



 To use:
  1. Clone the repo to your local machine.
  2. Create a folder called .env and add a file called .dev-sample, fill it in the way expressed below this list
  3. Install docker desktop and run the docker desktop app
  4. Go to the directory containing docker-compose.yml within  your CMD
  5. Run: docker-compose build
  6. Once complete, run: docker-compose up
  7. Head to [localhost:](http://localhost:3000/) and enjoy 

 For the environment variables:
  DEBUG=1
  SECRET_KEY=dbaa1_i7%*3r9-=z-+_mz4r-!qeed@(-a_r(g@k8jo8y3r27%m
  DJANGO_ALLOWED_HOSTS=*#
 
 
  SQL_ENGINE=django.db.backends.mysql
  SQL_HOST=db
  SQL_USER=root
  SQL_PASSWORD=
  SQL_DATABASE=django-app-db
  SQL_PORT=3306
 
  CELERY_BROKER=redis://redis:6379/0
  CELERY_BACKEND=redis://redis:6379/0
  CHANNELS_REDIS=redis://redis:6379/0
 
  GOOGLE_API_KEY=     CREATE YOUR OWN USING GOOGLE MAPS API
 
 EMAIL= YOUR EMAIL WITH SMTP
 EMAIL_PASSWORD= YOUR EMAIL SMTP PASSWORD

You can find tutorials online for how to convert your gmail account into a email SMTP, you can also get a GOOGLE_API_KEY from the Google Cloud services. You do not need this use most features, however when you attempt to add an address to your club the system will encounter an error. 

To turn off Django debug mode, set DEBUG=0.
