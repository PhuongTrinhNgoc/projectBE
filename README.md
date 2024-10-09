# list API : 
-user : {url}/api/v1/auth/signup - method post
        body: "userType":["1"], ==> ["1"] or  ["2"] or  ["1","2"] 
              "firstName":"test",
              "lastName" :"test",
              "email": "abc@mail.com",
              "password": "1234567", -> min 7 
              "confirmPassword":"1234567",
             
         {url}/api/v1/auth/login - method post
          body:  "email": "abc@mail.com",
                  "password": "1234567"
                  
        {url}/api/v1/auth/changePassword - method post
           body:   "currentPassword": "1234567",
                  "newPassword": "12345678"
                   "confirmPassword":"12345678"

        {url}/api/v1/auth/forgot-password"
                  body: "email": "abc@mail.com",
                  
        {url}/reset-password/:token - method post
                  check code send in email : 
                  body: "resetCode":"123451"
                          "newPassword":"1234567"
                          =======
-project : {url}/api/v1/projects -> create a project : method post 
            body :  "title":"PHUONG ADD system test 4",
                    "productImage":["img.png"],
                    "price":"25.0",
                    "shortDescription":"test shiutr efds csd ds fđ sd sss ",
                    "description":"description test",
                    "productUrl":"img.png",
                    "category":["nodejs","backend"],
                    "tags":["test tags","backend project"]

          {url}/api/v1/projects/:id    -> update a project : method patch 
                body : like create
                
           {url}/api/v1/projects/:id  -> deletle a project : method delete 

           {url}/api/v1/projects -> get all project : method GET 

            -> get a project : method GET 
           {url}/api/v1/projects/:id



    
