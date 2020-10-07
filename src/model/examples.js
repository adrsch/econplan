const examples = [
  {
    name: 'Basic economy',
    description: 'Not much here...',
    model: {
      resources: [
        {
          labor: 3,
        },
        {
          labor: 3.01,
        },
      ],
      production: {
        iron: {
          inputs: {
            iron: 0.1,
            coal: 2,
            labor: 0.3,
          },
          capitalStocks: {
            iron: 10,
            coal: 2,                                   
          },                                           
          depreciation: {                              
            iron: 0.07,                                
            coal: 0.5,                                 
          },                                           
          output: 10,                                  
        },                                           
        coal: {                                      
          inputs: {                                  
            coal: 1,                                 
            iron: 0,                                 
            labor: 1,                                
          },                                         
          output: 8,                                 
          capitalStocks: {                           
            iron: 4,                                 
            coal: 1,                                 
          },                                         
          depreciation: {                            
            iron: 0.07,                              
            coal: 0.5,                               
          },                                         
        }, 
      },
      targets: [
        {
          iron: 0.1,
          coal: 3,
        },
        {
          iron: 0.1,
          coal: 3,
        },
      ],
    },
  },
];

export default examples;
